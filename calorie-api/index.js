const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 7000;

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Generate AI nutritionist response with food analysis
async function generateNutritionistResponse(userMessage, userName = null) {
  const systemPrompt = `You are NutriBot, a friendly, funny, and highly knowledgeable AI nutritionist. You're an expert in nutrition analysis and calorie counting.

Your personality:
- Very friendly and use emojis occasionally 😊
- Funny and encouraging, never judgmental
- Use the person's name naturally if provided
- Give practical, actionable advice
- Be supportive of their health journey
- Make nutrition fun and easy to understand

Your capabilities:
- Analyze ANY food mentioned and provide accurate nutritional information
- Calculate calories, protein, carbs, fat for any meal
- Understand portion sizes and quantities (2 eggs, 1 cup rice, 1 slice bread, etc.)
- Provide nutrition advice for ANY cuisine (Indian, Western, Asian, etc.)
- Suggest meal improvements and alternatives
- Answer general nutrition questions
- Help with weight loss/gain goals

When user mentions food they ate:
1. Identify all food items and quantities
2. Calculate approximate calories and macros for each item
3. Provide total nutritional breakdown
4. Give feedback on the meal (balanced? missing nutrients?)
5. Suggest what to eat next or improvements
6. Be encouraging about their choices

For general nutrition questions:
- Provide accurate, evidence-based information
- Keep it simple and actionable
- Add some humor to make it engaging

Format food analysis responses like this when relevant:
🍽️ **Meal Analysis:**
- Item 1: X calories, Y protein, Z carbs, W fat
- Item 2: X calories, Y protein, Z carbs, W fat
📊 **Total:** X calories, Y protein, Z carbs, W fat

Always end with encouragement or a helpful tip!

Remember: You have access to comprehensive nutritional knowledge of foods from all cuisines and cultures. Use your training data to provide accurate nutrition information - don't say you don't know about specific foods.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return `Hey there! I'm having a little trouble connecting right now 😅 But I'm still here to help! Try asking me again in a moment!`;
  }
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "NutriBot API is running!",
    model: "gpt-4o-mini",
    features: [
      "nutrition_analysis",
      "calorie_counting",
      "meal_planning",
      "diet_advice",
    ],
  });
});

// Main chat endpoint - handles all nutrition conversations
app.post("/api/chat", async (req, res) => {
  try {
    const { message, userName } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        error: "Message is required",
        response: "Hey! I need a message to help you out! 😊",
      });
    }

    // Generate AI response with full nutrition intelligence
    const aiResponse = await generateNutritionistResponse(message, userName);

    // Determine response type for frontend formatting
    const responseType = determineResponseType(message);

    res.json({
      response: aiResponse,
      responseType: responseType,
      timestamp: new Date().toISOString(),
      userName: userName || null,
    });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({
      error: "Something went wrong!",
      response: `Oops! I'm having a tiny hiccup 😅 Let me try that again! Please resend your message.`,
    });
  }
});

// Helper function to determine response type for frontend
function determineResponseType(message) {
  const lower = message.toLowerCase();

  // Food logging patterns
  const foodPatterns = [
    "ate",
    "had",
    "consumed",
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "meal",
    "food",
    "calories",
    "protein",
    "carbs",
    "fat",
    "nutrition",
  ];

  // Question patterns
  const questionPatterns = [
    "what should i eat",
    "how much",
    "is it healthy",
    "good for",
    "bad for",
    "should i avoid",
    "can i eat",
    "help me",
    "advice",
    "suggest",
    "recommend",
  ];

  // Chart-worthy patterns
  const chartPatterns = [
    "track",
    "progress",
    "compare",
    "daily",
    "weekly",
    "goal",
    "target",
  ];

  if (foodPatterns.some((pattern) => lower.includes(pattern))) {
    return "food_analysis";
  } else if (chartPatterns.some((pattern) => lower.includes(pattern))) {
    return "chart_data";
  } else if (questionPatterns.some((pattern) => lower.includes(pattern))) {
    return "advice";
  } else {
    return "general";
  }
}

// Get nutrition facts for specific food (support endpoint)
app.get("/api/nutrition-facts/:food", async (req, res) => {
  try {
    const food = req.params.food;
    const quantity = req.query.quantity || "100g";

    const query = `Provide detailed nutritional information for ${quantity} of ${food}. Include calories, protein, carbs, fat, fiber, vitamins, and minerals. Format as JSON.`;

    const response = await generateNutritionistResponse(query);

    res.json({
      food: food,
      quantity: quantity,
      nutritionInfo: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Nutrition Facts Error:", error);
    res.status(500).json({
      error: "Could not fetch nutrition facts",
      message: "Try asking in the main chat instead!",
    });
  }
});

// Get meal suggestions (support endpoint)
app.get("/api/meal-suggestions", async (req, res) => {
  try {
    const { goal, cuisine, calories } = req.query;

    let query = "Suggest 3 healthy meal ideas";
    if (goal) query += ` for ${goal}`;
    if (cuisine) query += ` in ${cuisine} cuisine`;
    if (calories) query += ` with approximately ${calories} calories each`;

    const response = await generateNutritionistResponse(query);

    res.json({
      suggestions: response,
      parameters: { goal, cuisine, calories },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Meal Suggestions Error:", error);
    res.status(500).json({
      error: "Could not generate meal suggestions",
      message: "Try asking for meal ideas in the main chat!",
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    response:
      "Our nutritionist is taking a quick break! Try again in a moment! 😊",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: "Use /api/chat for nutrition conversations!",
    availableEndpoints: [
      "POST /api/chat",
      "GET /api/nutrition-facts/:food",
      "GET /api/meal-suggestions",
      "GET /health",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 NutriBot API running on port ${PORT}`);
  console.log(`💚 Ready to analyze nutrition with AI intelligence!`);
  console.log(`🧠 Using GPT-4o-mini for smart food analysis`);
  console.log(`📱 No database - pure AI-powered nutrition advice`);
});

module.exports = app;
