require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const PROMPT_TOPICS = [
  "Benefits of daily vitamin D",
  "How to manage high blood pressure naturally",
  "The importance of hydration for kidney health",
  "Tips for better sleep and mental health",
  "Understanding common cold vs flu symptoms",
  "Healthy eating habits for diabetes management",
  "The role of regular exercise in heart health",
  "Mental well-being during stressful times",
  "Importance of a balanced diet for immune system",
  "Simple ways to reduce cholesterol"
];

async function generateAndPostBlog() {
  console.log(`[${new Date().toLocaleTimeString()}] Generating new health blog...`);
  
  if (!GROQ_API_KEY) {
    console.error("ERROR: EXPO_PUBLIC_GROQ_API_KEY is not set in .env file.");
    return;
  }

  try {
    const randomTopic = PROMPT_TOPICS[Math.floor(Math.random() * PROMPT_TOPICS.length)];
    
    const prompt = `Write a comprehensive, highly engaging, and beautifully formatted educational health blog post about: ${randomTopic}.
Requirements:
1. Must strictly follow WHO guidelines and provide scientifically accurate information.
2. Structure the blog with a catchy Title, an engaging Introduction, 3-4 detailed sections with clear subheadings (##), bullet points (- ) or numbered lists (1. ) for all key points, and a strong Conclusion.
3. DO NOT use any emojis or icons. Keep it professional.
4. Aim for around 400-500 words to provide deep, valuable insights.
5. Provide ONLY a valid JSON object with exactly two keys: "content" (the full blog markdown including the title) and "imagePrompt" (a highly descriptive, 20-word text-to-image prompt to generate a photorealistic cover image for this exact blog post, describing objects, colors, and clinical/medical aesthetic without any text).`;

    // Fetch from Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({ 
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content || "{}";
    
    let parsed = {};
    try {
      parsed = JSON.parse(rawResponse);
    } catch (e) {
      console.error("Failed to parse JSON from Groq", rawResponse);
      return;
    }
    
    const content = parsed.content || "";
    const specificImagePrompt = parsed.imagePrompt || `Professional medical blog cover photo about ${randomTopic}, clean pharmacy aesthetic, high quality, 4k`;
    
    // Generate AI Image using Pollinations with the highly specific prompt
    const encodedTopic = encodeURIComponent(specificImagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedTopic}?width=800&height=600&nologo=true`;

    // Extract title from the first line or use default
    let title = `Health Insight: ${randomTopic}`;
    const lines = content.split('\n');
    const titleLineIndex = lines.findIndex(l => l.toLowerCase().includes('health insight:'));
    if (titleLineIndex !== -1) {
      title = lines[titleLineIndex].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    }

    const blogPost = {
      title,
      content,
      imageUrl: imageUrl,
      fallbackImageUrl: imageUrl,
      status: "PUBLISHED",
      likes: 0,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'blogs'), blogPost);
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Successfully published blog: "${title}" (ID: ${docRef.id})`);
    
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Failed to generate or post blog:`, error.message);
  }
}

async function startGenerator() {
  const botEmail = "autoblog_bot123@medicarex.com";
  const botPass = "AutoBlogBot@123";
  
  try {
    console.log("Authenticating with Firebase...");
    try {
      await signInWithEmailAndPassword(auth, botEmail, botPass);
      console.log("✅ Authenticated successfully as Bot!");
    } catch (loginError) {
      console.log("Bot account not found or invalid, creating a new dedicated Bot account automatically...");
      await createUserWithEmailAndPassword(auth, botEmail, botPass);
      console.log("✅ Bot account created and authenticated!");
    }

    // Generate the first one immediately, then every 2 minutes
    generateAndPostBlog();
    const INTERVAL_MS = 2 * 60 * 1000; 
    setInterval(generateAndPostBlog, INTERVAL_MS);

    console.log("🚀 Auto-blog generator started! Running every 2 minutes with Groq AI.");
  } catch (error) {
    console.error("Authentication failed:", error.message);
  }
}

startGenerator();
