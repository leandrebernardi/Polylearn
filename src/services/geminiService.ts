import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export type Subject = 'English' | 'French' | 'HTML' | 'CSS' | 'JavaScript' | string;

export interface Lesson {
  title: string;
  content: string;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
}

export interface Unit {
  title: string;
  description: string;
  lessons: { title: string; order: number }[];
}

export interface Curriculum {
  title: string;
  description: string;
  units: Unit[];
}

export interface PlacementTest {
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
}

export async function generateTrendingSubjects(): Promise<{ title: string; icon: string; category: string; description: string }[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Generate 3 unique and interesting learning subjects that would be popular on a learning app. For each, provide a title, a single emoji icon, a category (Language, Programming, Science, History, or Other), and a short one-sentence description. Return as JSON.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            icon: { type: Type.STRING },
            category: { type: Type.STRING, enum: ["Language", "Programming", "Science", "History", "Other"] },
            description: { type: Type.STRING }
          },
          required: ["title", "icon", "category", "description"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function generateCurriculum(subject: string): Promise<Curriculum> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create an extensive Duolingo-style learning curriculum for ${subject}. 
    This should be a long-term course (e.g., 10 units). 
    Each unit should have a clear theme and 5 lessons. 
    Return a structured curriculum with titles and short descriptions.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          units: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                lessons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      order: { type: Type.INTEGER }
                    },
                    required: ["title", "order"]
                  }
                }
              },
              required: ["title", "description", "lessons"]
            }
          }
        },
        required: ["title", "description", "units"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePlacementTest(subject: string): Promise<PlacementTest> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a 5-question placement test for ${subject}. 
    Include questions of varying difficulty (easy, medium, hard) to determine the student's level.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] }
              },
              required: ["question", "options", "correctAnswer", "difficulty"]
            }
          }
        },
        required: ["questions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function evaluatePlacementTest(subject: string, answers: Record<number, number>, test: PlacementTest): Promise<{ startingUnit: number; feedback: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Evaluate a student's placement test for ${subject}. 
    Test: ${JSON.stringify(test)}
    Answers: ${JSON.stringify(answers)}
    Based on their performance, determine which unit (0-9) they should start at in a 10-unit course. 
    Provide short encouraging feedback.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          startingUnit: { type: Type.INTEGER },
          feedback: { type: Type.STRING }
        },
        required: ["startingUnit", "feedback"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateLesson(subject: string, lessonTitle: string): Promise<Lesson> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a comprehensive lesson for ${subject} titled "${lessonTitle}". 
    Include educational content in markdown and a 3-question quiz.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["title", "content", "quiz"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function askTutor(subject: string, question: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert tutor in ${subject}. Answer the following student question clearly and concisely: ${question}`,
  });
  return response.text || "I'm sorry, I couldn't generate an answer.";
}
