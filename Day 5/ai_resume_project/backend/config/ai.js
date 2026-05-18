const Groq = require('groq-sdk');

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || "gsk_MOCK_KEY" 
});

/**
 * Robust JSON extraction from AI response text
 */
const extractJSON = (text) => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
    const stripped = text.replace(/```json|```/g, "").trim();
    return JSON.parse(stripped);
  } catch (error) {
    console.error("JSON Extraction Error:", error.message);
    throw new Error("Failed to parse AI response into valid JSON");
  }
};

/**
 * Analyzes resume text and extracts structured data.
 */
exports.analyzeResume = async (text) => {
  const prompt = `
    Analyze this resume text and return a JSON object. 
    Focus on extracting the real Full Name and professional skills.
    
    Structure:
    {
      "fullName": "Name found in resume",
      "email": "Email found",
      "score": 0-100,
      "skills": ["Skill1", "Skill2"],
      "summary": "Short 2-sentence professional bio",
      "experience": [{"role": "", "company": "", "duration": "", "description": ""}],
      "education": [{"degree": "", "school": "", "year": ""}],
      "suggestions": ["Specific tip 1", "Specific tip 2"]
    }
    
    Resume Text:
    ${text}
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1, // Lower temperature for more consistent JSON
      response_format: { type: "json_object" } // Groq supports JSON mode
    });

    const content = chatCompletion.choices[0].message.content;
    return extractJSON(content);
  } catch (error) {
    console.error("Groq Analysis Error:", error.message);
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const fallbackName = lines.length > 0 ? lines[0] : "Candidate";
    const commonSkills = ['React', 'Node.js', 'JavaScript', 'Python', 'Java', 'SQL', 'MongoDB', 'Docker', 'AWS', 'TypeScript', 'HTML', 'CSS'];
    const foundSkills = commonSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase()));

    return {
      fullName: fallbackName,
      email: "Extracted from PDF",
      score: 75,
      suggestions: ["Consider improving your profile summary."],
      skills: foundSkills.length > 0 ? foundSkills : ["Communication", "Problem Solving"],
      experience: [],
      education: [],
      summary: text.substring(0, 300) + "..."
    };
  }
};

/**
 * Generates personalized interview questions based on analyzed resume data.
 */
exports.generateInterviewQuestions = async (resumeData) => {
  const prompt = `
    Analyze the resume and generate exactly 16 interview questions.
    The questions MUST reference specific projects, roles, or skills mentioned in the resume.
    
    Balanced categories (4 per category):
    - Technical (related to listed skills)
    - Behavioral (soft skills)
    - Educational (academic background)
    - Resume Related (specific projects or experiences)
    
    Return a JSON array of exactly 16 objects:
    [
      {
        "category": "Technical" | "Behavioral" | "Educational" | "Resume Related",
        "question": "Deeply personalized question",
        "suggestedAnswer": "Strategic answer"
      }
    ]
    
    Resume Data:
    ${JSON.stringify(resumeData)}
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0].message.content;
    const parsed = extractJSON(content);
    // If it's a JSON object with a key like "questions", extract the array
    return Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed)[0]);
  } catch (error) {
    console.error("Groq Question Generation Error:", error.message);
    const questions = [];
    const categories = ["Technical", "Behavioral", "Educational", "Resume Related"];
    const skills = resumeData.skills || ["Software Development", "Problem Solving"];
    
    const questionPool = {
      Technical: [
        "Can you explain your experience with [SKILL]?",
        "What are the best practices when working with [SKILL]?",
        "Describe a difficult technical challenge you solved using [SKILL].",
        "How do you stay updated with the latest trends in [SKILL]?",
        "Explain the core concepts of [SKILL] to someone with a non-technical background.",
        "What are the common pitfalls to avoid when using [SKILL]?"
      ],
      Behavioral: [
        "Tell me about a time you handled a difficult team dynamic.",
        "Describe a situation where you had to meet a tight deadline.",
        "How do you handle constructive criticism from a peer or manager?",
        "Tell me about a time you failed and what you learned from it.",
        "How do you prioritize your tasks when you have multiple projects?",
        "Describe a time you went above and beyond your job description."
      ],
      Educational: [
        "How did your formal education prepare you for this role?",
        "What was your favorite subject during your studies and why?",
        "Tell me about a significant academic project you completed.",
        "How do you apply the theoretical knowledge from your degree to practical work?",
        "What motivated you to pursue your field of study?",
        "If you could study something else today, what would it be and why?"
      ],
      "Resume Related": [
        "What was the most challenging project mentioned on your resume?",
        "Can you walk me through the architecture of your most recent project?",
        "How did your contribute to the success of your team at your last role?",
        "What impact did your work have on the overall goals of your previous company?",
        "Describe a technical decision you made in a project and the reasoning behind it.",
        "What skills from your past experience do you think are most relevant here?"
      ]
    };

    for (let i = 0; i < 16; i++) {
      const category = categories[i % 4];
      const pool = questionPool[category];
      const rawQuestion = pool[Math.floor(Math.random() * pool.length)];
      let question = rawQuestion;
      if (category === "Technical") {
        const skill = skills[Math.floor(Math.random() * skills.length)];
        question = rawQuestion.replace("[SKILL]", skill);
      }
      questions.push({ 
        category, 
        question, 
        suggestedAnswer: "Provide a structured answer using the STAR method (Situation, Task, Action, Result). Highlight your specific contributions and the positive outcome." 
      });
    }
    return questions;
  }
};



/**
 * Generates interview questions based on a specific language or technology.
 */
exports.generateLanguageQuestions = async (language) => {
  const prompt = `
    Generate exactly 10 interview questions for the programming language or technology: ${language}.
    
    The questions should be a mix of:
    - Basic concepts
    - Advanced topics
    - Practical coding scenarios
    
    Return a JSON array of exactly 10 objects:
    [
      {
        "category": "Technical",
        "question": "The question text",
        "suggestedAnswer": "A concise but thorough suggested answer"
      }
    ]
    
    Ensure the JSON is valid and only return the JSON array.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0].message.content;
    const parsed = extractJSON(content);
    return Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed)[0]);
  } catch (error) {
    console.error("Groq Language Question Generation Error:", error.message);
    // Fallback questions for common languages if AI fails
    const fallbacks = [
      { category: 'Technical', question: `What are the core features of ${language}?`, suggestedAnswer: `Core features of ${language} include its syntax, standard libraries, and specific paradigms it supports.` },
      { category: 'Technical', question: `Explain a common design pattern used in ${language}.`, suggestedAnswer: `Common patterns depend on the language, such as Singleton, Factory, or Observer patterns.` },
      { category: 'Technical', question: `How does memory management work in ${language}?`, suggestedAnswer: `Memory management can be manual or automatic (Garbage Collection) depending on the language.` }
    ];
    return fallbacks;
  }
};
