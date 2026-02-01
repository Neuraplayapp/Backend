/**
 * DEMO COURSE DATA
 * 
 * Comprehensive demo courses showcasing ALL chunk types and quiz variants:
 * - hook, concept, example, visual, practice, recap, quiz, vocabulary
 * - Multiple choice, true/false, fill-in-the-blank quizzes
 * - Different interaction types: read, watch, reflect, try
 */

import type { GenerativeLearningModuleData, CourseSection, CourseChunk } from '../types/LearningModule.types';

export const DEMO_COURSES: GenerativeLearningModuleData[] = [
  // ============================================================================
  // DEMO 1: JavaScript Fundamentals (Showcases ALL Chunk Types)
  // ============================================================================
  {
    id: 'demo-javascript',
    title: 'JavaScript Fundamentals',
    description: 'Master the basics of JavaScript with interactive examples, quizzes, and practice exercises. This demo course showcases all chunk types.',
    category: 'Technology',
    difficulty: 'Beginner',
    type: 'generative',
    subject: 'Programming',
    topics: ['Variables', 'Functions', 'Objects', 'Arrays'],
    thumbnail: '/assets/images/Mascot.png',
    estimatedMinutes: 45,
    lastAccessed: new Date().toISOString(),
    progress: 35,
    hasGeneratedContent: true,
    learningObjectives: [
      'Understand JavaScript basics',
      'Write clean, functional code',
      'Master ES6+ features'
    ],
    generatedCourse: {
      title: 'JavaScript Fundamentals',
      description: 'Complete introduction to JavaScript programming',
      objectives: [
        'Understand JavaScript basics',
        'Write clean, functional code',
        'Master ES6+ features'
      ],
      prerequisites: ['Basic computer skills', 'Text editor'],
      targetAudience: 'Beginners with no prior programming experience',
      sections: [
        {
          id: 'js-section-1',
          title: 'Getting Started with JavaScript',
          description: 'Introduction to JavaScript and setting up your environment',
          estimatedMinutes: 15,
          learningObjectives: ['Understand what JavaScript is', 'Set up development environment'],
          chunks: [
            // CHUNK TYPE: hook (Introduction)
            {
              id: 'js-chunk-1',
              type: 'hook',
              title: 'Why JavaScript?',
              content: `JavaScript powers 98% of websites on the internet. From simple animations to complex web applications, JavaScript is everywhere!

In this course, you'll learn to bring websites to life with interactive features. Ready to start coding?`,
              estimatedMinutes: 2,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            // CHUNK TYPE: concept (Core learning)
            {
              id: 'js-chunk-2',
              type: 'concept',
              title: 'Variables and Data Types',
              content: `# Variables in JavaScript

Variables are containers for storing data. In JavaScript, we declare variables using:

- \`let\` - for values that can change
- \`const\` - for values that stay constant
- \`var\` - older way (avoid in modern code)

## Data Types

JavaScript has several data types:
- **String**: Text data ("hello")
- **Number**: Numeric data (42, 3.14)
- **Boolean**: true or false
- **Array**: Lists of values ([1, 2, 3])
- **Object**: Key-value pairs ({name: "John"})`,
              estimatedMinutes: 5,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            // CHUNK TYPE: example (Practical demonstration)
            {
              id: 'js-chunk-3',
              type: 'example',
              title: 'Variable Examples',
              content: `Let's see variables in action:

\`\`\`javascript
// Declaring variables
let userName = "Alice";
const age = 25;
let isStudent = true;

// Using variables
console.log("Hello, " + userName);
console.log("Age: " + age);

// Changing values
userName = "Bob"; // ✅ Works with 'let'
// age = 26;  // ❌ Error! Can't change 'const'
\`\`\`

**Try it yourself**: Open your browser console (F12) and type these commands!`,
              estimatedMinutes: 4,
              interactionType: 'try',
              difficulty: 'Beginner'
            },
            // CHUNK TYPE: visual (Diagram/illustration)
            {
              id: 'js-chunk-4',
              type: 'visual',
              title: 'How Variables Work',
              content: `# Variable Storage Visualization

Think of variables like labeled boxes:

\`\`\`
┌──────────────┐      ┌──────────────┐
│   userName   │      │     age      │
│   ┌──────┐   │      │   ┌──────┐   │
│   │"Alice"│   │      │   │  25  │   │
│   └──────┘   │      │   └──────┘   │
└──────────────┘      └──────────────┘
     let                    const
   (can change)          (stays same)
\`\`\`

Each variable points to a value in memory. \`let\` variables can be reassigned, while \`const\` variables cannot.`,
              estimatedMinutes: 3,
              interactionType: 'watch',
              difficulty: 'Beginner',
              mediaUrl: '/assets/diagrams/variables.png' // Optional
            },
            // CHUNK TYPE: practice (Exercise)
            {
              id: 'js-chunk-5',
              type: 'practice',
              title: 'Practice: Create Your Variables',
              content: `## Your Turn!

Create the following variables:

1. A \`const\` variable called \`firstName\` with your name
2. A \`let\` variable called \`score\` set to 0
3. A \`let\` variable called \`isPlaying\` set to true

Then try changing the score to 10.

**Solution:**
\`\`\`javascript
const firstName = "YourName";
let score = 0;
let isPlaying = true;

score = 10; // ✅ This works!
\`\`\``,
              estimatedMinutes: 5,
              interactionType: 'try',
              difficulty: 'Beginner'
            },
            // CHUNK TYPE: quiz (Multiple choice)
            {
              id: 'js-chunk-6',
              type: 'quiz',
              title: 'Variables Quiz',
              content: 'Test your knowledge of JavaScript variables',
              estimatedMinutes: 3,
              interactionType: 'quiz',
              difficulty: 'Beginner',
              quiz: {
                questions: [
                  {
                    id: 'q1',
                    question: 'Which keyword should you use for a value that won\'t change?',
                    type: 'multiple-choice',
                    options: ['let', 'const', 'var', 'variable'],
                    correctAnswer: 'const',
                    explanation: 'Use `const` for values that should remain constant throughout your code.'
                  },
                  {
                    id: 'q2',
                    question: 'Can you reassign a variable declared with `const`?',
                    type: 'true-false',
                    options: ['True', 'False'],
                    correctAnswer: 'False',
                    explanation: 'Variables declared with `const` cannot be reassigned after initialization.'
                  },
                  {
                    id: 'q3',
                    question: 'What data type is "Hello World"?',
                    type: 'multiple-choice',
                    options: ['Number', 'Boolean', 'String', 'Object'],
                    correctAnswer: 'String',
                    explanation: 'Text enclosed in quotes is a String data type.'
                  }
                ]
              }
            },
            // CHUNK TYPE: recap (Summary)
            {
              id: 'js-chunk-7',
              type: 'recap',
              title: 'Section Summary',
              content: `# What We Learned

## Key Takeaways:
- ✅ Variables store data using \`let\`, \`const\`, or \`var\`
- ✅ JavaScript has multiple data types (String, Number, Boolean, etc.)
- ✅ Use \`const\` for values that don't change
- ✅ Use \`let\` for values that do change
- ✅ Variables are like labeled boxes in memory

## Next Steps:
Ready to learn about functions? Let's continue!`,
              estimatedMinutes: 2,
              interactionType: 'read',
              difficulty: 'Beginner'
            }
          ]
        },
        // Section 2: Functions
        {
          id: 'js-section-2',
          title: 'Functions & Logic',
          description: 'Learn to create reusable code with functions',
          estimatedMinutes: 20,
          learningObjectives: ['Create functions', 'Use parameters', 'Return values'],
          chunks: [
            {
              id: 'js-chunk-8',
              type: 'concept',
              title: 'What are Functions?',
              content: `# Functions in JavaScript

Functions are reusable blocks of code that perform specific tasks.

\`\`\`javascript
function greet(name) {
  return "Hello, " + name;
}

console.log(greet("Alice")); // "Hello, Alice"
\`\`\`

Functions help you:
- ✅ Avoid repeating code
- ✅ Organize your program
- ✅ Make code easier to test`,
              estimatedMinutes: 4,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            {
              id: 'js-chunk-9',
              type: 'practice',
              title: 'Build Your First Function',
              content: `Create a function called \`multiply\` that takes two numbers and returns their product.

**Challenge:**
\`\`\`javascript
function multiply(a, b) {
  // Your code here
}

console.log(multiply(5, 3)); // Should print 15
\`\`\``,
              estimatedMinutes: 5,
              interactionType: 'try',
              difficulty: 'Beginner'
            },
            {
              id: 'js-chunk-10',
              type: 'quiz',
              title: 'Functions Quiz',
              content: 'Test your understanding of functions',
              estimatedMinutes: 4,
              interactionType: 'quiz',
              difficulty: 'Beginner',
              quiz: {
                questions: [
                  {
                    id: 'q4',
                    question: 'What keyword is used to send a value back from a function?',
                    type: 'fill-in-blank',
                    correctAnswer: 'return',
                    explanation: 'The `return` keyword sends a value back to the caller.'
                  },
                  {
                    id: 'q5',
                    question: 'Functions can be reused multiple times',
                    type: 'true-false',
                    options: ['True', 'False'],
                    correctAnswer: 'True',
                    explanation: 'One of the main benefits of functions is code reusability!'
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  },
  
  // ============================================================================
  // DEMO 2: Machine Learning (Visual & Concept Heavy)
  // ============================================================================
  {
    id: 'demo-machine-learning',
    title: 'Introduction to Machine Learning',
    description: 'Explore AI and ML concepts with visual examples and interactive quizzes.',
    category: 'Science',
    difficulty: 'Intermediate',
    type: 'generative',
    subject: 'Artificial Intelligence',
    topics: ['Neural Networks', 'Training Models', 'Classification'],
    thumbnail: '/assets/images/Mascot.png',
    estimatedMinutes: 60,
    lastAccessed: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    progress: 60,
    hasGeneratedContent: true,
    learningObjectives: [
      'Understand ML fundamentals',
      'Build your first model',
      'Evaluate model performance'
    ],
    generatedCourse: {
      title: 'Introduction to Machine Learning',
      description: 'Comprehensive introduction to AI and machine learning concepts',
      objectives: ['Understand ML fundamentals', 'Build your first model', 'Evaluate performance'],
      prerequisites: ['Basic Python', 'Statistics basics'],
      targetAudience: 'Students and professionals interested in AI',
      sections: [
        {
          id: 'ml-section-1',
          title: 'What is Machine Learning?',
          description: 'Understanding the basics of AI and ML',
          estimatedMinutes: 20,
          learningObjectives: ['Define machine learning', 'Understand types of ML'],
          chunks: [
            {
              id: 'ml-chunk-1',
              type: 'hook',
              title: 'AI is Everywhere',
              content: `From Netflix recommendations to self-driving cars, machine learning powers the technology we use every day.

Want to understand how it works? Let's dive in!`,
              estimatedMinutes: 2,
              interactionType: 'read',
              difficulty: 'Intermediate'
            },
            {
              id: 'ml-chunk-2',
              type: 'visual',
              title: 'Types of Machine Learning',
              content: `# Three Main Types of ML

\`\`\`
┌─────────────────────────────────────────┐
│     SUPERVISED LEARNING                 │
│  Input → Model → Predicted Output       │
│  (Has labeled training data)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     UNSUPERVISED LEARNING               │
│  Input → Model → Find Patterns          │
│  (No labels, discovers structure)       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     REINFORCEMENT LEARNING              │
│  Agent → Actions → Rewards/Penalties    │
│  (Learns through trial and error)       │
└─────────────────────────────────────────┘
\`\`\``,
              estimatedMinutes: 5,
              interactionType: 'watch',
              difficulty: 'Intermediate'
            },
            {
              id: 'ml-chunk-3',
              type: 'vocabulary',
              title: 'ML Vocabulary',
              content: `## Key Terms

**Model**: The mathematical function that makes predictions
**Training**: Teaching the model using example data
**Features**: Input variables used for prediction
**Labels**: The correct answers in training data
**Accuracy**: How often the model makes correct predictions`,
              estimatedMinutes: 3,
              interactionType: 'read',
              difficulty: 'Intermediate'
            }
          ]
        }
      ]
    }
  },

  // ============================================================================
  // DEMO 3: Spanish for Travelers (Vocabulary & Quiz Heavy)
  // ============================================================================
  {
    id: 'demo-spanish',
    title: 'Spanish for Travelers',
    description: 'Learn essential Spanish phrases with vocabulary chunks, pronunciation guides, and quiz practice.',
    category: 'Language',
    difficulty: 'Beginner',
    type: 'generative',
    subject: 'Spanish Language',
    topics: ['Greetings', 'Numbers', 'Directions', 'Food'],
    thumbnail: '/assets/images/Mascot.png',
    estimatedMinutes: 30,
    lastAccessed: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    progress: 80,
    hasGeneratedContent: true,
    learningObjectives: [
      'Basic conversation skills',
      'Essential vocabulary',
      'Cultural understanding'
    ],
    generatedCourse: {
      title: 'Spanish for Travelers',
      description: 'Essential Spanish for your next adventure',
      objectives: ['Basic conversation skills', 'Essential vocabulary', 'Cultural understanding'],
      prerequisites: ['None'],
      targetAudience: 'Travelers and Spanish language learners',
      sections: [
        {
          id: 'sp-section-1',
          title: 'Greetings & Basics',
          description: 'Learn how to greet people and introduce yourself',
          estimatedMinutes: 15,
          learningObjectives: ['Say hello', 'Introduce yourself', 'Ask simple questions'],
          chunks: [
            {
              id: 'sp-chunk-1',
              type: 'vocabulary',
              title: 'Essential Greetings',
              content: `## Common Greetings

**Hola** - Hello
**Buenos días** - Good morning
**Buenas tardes** - Good afternoon
**Buenas noches** - Good evening/night
**¿Cómo estás?** - How are you?
**Bien, gracias** - Fine, thank you
**¿Y tú?** - And you?
**Adiós** - Goodbye
**Hasta luego** - See you later`,
              estimatedMinutes: 4,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            {
              id: 'sp-chunk-2',
              type: 'example',
              title: 'Conversation Example',
              content: `# Sample Conversation

**María:** ¡Hola! ¿Cómo estás?
**Juan:** Bien, gracias. ¿Y tú?
**María:** Muy bien. ¿Cómo te llamas?
**Juan:** Me llamo Juan. ¿Y tú?
**María:** Me llamo María. Encantada.
**Juan:** Igualmente.

---

**Translation:**
**María:** Hello! How are you?
**Juan:** Fine, thanks. And you?
**María:** Very well. What's your name?
**Juan:** My name is Juan. And you?
**María:** My name is María. Nice to meet you.
**Juan:** Likewise.`,
              estimatedMinutes: 5,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            {
              id: 'sp-chunk-3',
              type: 'quiz',
              title: 'Greetings Quiz',
              content: 'Test your Spanish greetings',
              estimatedMinutes: 4,
              interactionType: 'quiz',
              difficulty: 'Beginner',
              quiz: {
                questions: [
                  {
                    id: 'sq1',
                    question: 'What does "Buenos días" mean?',
                    type: 'multiple-choice',
                    options: ['Good afternoon', 'Good morning', 'Good evening', 'Goodbye'],
                    correctAnswer: 'Good morning',
                    explanation: '"Buenos días" is used to greet someone in the morning.'
                  },
                  {
                    id: 'sq2',
                    question: 'How do you say "How are you?" in Spanish?',
                    type: 'fill-in-blank',
                    correctAnswer: '¿Cómo estás?',
                    explanation: '"¿Cómo estás?" is the informal way to ask "How are you?"'
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  },

  // ============================================================================
  // DEMO 4: Memory Techniques (COMPLETED - Shows all types)
  // ============================================================================
  {
    id: 'demo-completed',
    title: 'Memory Techniques',
    description: 'Master memory enhancement techniques. A completed course showing all chunk types.',
    category: 'Memory',
    difficulty: 'Beginner',
    type: 'generative',
    subject: 'Cognitive Skills',
    topics: ['Mnemonics', 'Spaced Repetition', 'Memory Palace'],
    thumbnail: '/assets/images/Mascot.png',
    estimatedMinutes: 20,
    lastAccessed: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    progress: 100,
    hasGeneratedContent: true,
    learningObjectives: [
      'Improve memory retention',
      'Use proven techniques',
      'Apply to daily learning'
    ],
    generatedCourse: {
      title: 'Memory Techniques',
      description: 'Proven methods to enhance your memory',
      objectives: ['Improve memory retention', 'Use proven techniques', 'Apply to daily learning'],
      prerequisites: ['None'],
      targetAudience: 'Anyone wanting to improve their memory',
      sections: [
        {
          id: 'mem-section-1',
          title: 'Memory Fundamentals',
          description: 'Understanding how memory works',
          estimatedMinutes: 20,
          learningObjectives: ['Understand memory types', 'Learn key techniques'],
          chunks: [
            {
              id: 'mem-chunk-1',
              type: 'hook',
              title: 'Your Brain is Amazing',
              content: `Your brain can store an estimated 2.5 petabytes of information - that's about 3 million hours of video!

But are you using it effectively? Let's unlock your memory potential!`,
              estimatedMinutes: 2,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            {
              id: 'mem-chunk-2',
              type: 'concept',
              title: 'The Memory Palace Technique',
              content: `# Memory Palace (Method of Loci)

Used since ancient Rome, this technique uses spatial memory to store information.

**How it works:**
1. Choose a familiar place (your home, school route)
2. Place items you want to remember at specific locations
3. Mentally walk through the space to recall items

**Why it works:** Our brains are excellent at remembering spaces and locations!`,
              estimatedMinutes: 4,
              interactionType: 'read',
              difficulty: 'Beginner'
            },
            {
              id: 'mem-chunk-3',
              type: 'practice',
              title: 'Build Your Memory Palace',
              content: `## Try It Now!

Memorize this shopping list using your home:

1. Bananas → Front door
2. Milk → Living room couch
3. Bread → Kitchen table
4. Eggs → Bedroom
5. Coffee → Bathroom

Close your eyes and mentally walk through your home. Can you remember all 5 items?`,
              estimatedMinutes: 5,
              interactionType: 'try',
              difficulty: 'Beginner'
            },
            {
              id: 'mem-chunk-4',
              type: 'recap',
              title: 'Memory Mastery',
              content: `# You've Completed the Course! 🎉

## What You Learned:
- ✅ How memory works
- ✅ Memory Palace technique
- ✅ Practical application

## Your Memory Toolkit:
1. Use spatial memory (Memory Palace)
2. Create vivid associations
3. Practice regularly

**Keep practicing these techniques to strengthen your memory!**`,
              estimatedMinutes: 2,
              interactionType: 'read',
              difficulty: 'Beginner'
            }
          ]
        }
      ]
    }
  }
];

/**
 * Inject demo courses into the app on load
 * This populates the dashboard with example courses showing all features
 */
export const injectDemoCourses = (): void => {
  try {
    const existing = localStorage.getItem('neuraplay_custom_courses');
    const existingCourses = existing ? JSON.parse(existing) : [];
    
    // Remove old/broken demo courses first
    const nonDemoCourses = existingCourses.filter((c: any) => !c.id?.startsWith('demo-'));
    
    // Always inject fresh demo courses (ensures they have latest structure)
    console.log('📚 Injecting/updating demo courses...');
    const combined = [...DEMO_COURSES, ...nonDemoCourses];
    localStorage.setItem('neuraplay_custom_courses', JSON.stringify(combined));
    
    // Verify injection worked
    const verification = JSON.parse(localStorage.getItem('neuraplay_custom_courses') || '[]');
    const demoCount = verification.filter((c: any) => c.id?.startsWith('demo-')).length;
    console.log(`✅ Demo courses in storage: ${demoCount}/${DEMO_COURSES.length}`);
    
    // Log each demo course structure for debugging
    DEMO_COURSES.forEach(course => {
      const sectionsCount = course.generatedCourse?.sections?.length || 0;
      const chunksCount = course.generatedCourse?.sections?.reduce((sum, s) => sum + (s.chunks?.length || 0), 0) || 0;
      console.log(`  📚 ${course.title}: ${sectionsCount} sections, ${chunksCount} chunks`);
    });
  } catch (error) {
    console.error('❌ Failed to inject demo courses:', error);
  }
};
