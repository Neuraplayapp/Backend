# Fine-Tuning JSONL Generation Prompts for Intent Classification

## Overview
This document provides comprehensive prompts for generating JSONL training data for fine-tuning an intent classification model centered around the 41 neuropsychological concepts used in NeuraPlay. The model will be trained using Fireworks AI's `accounts/fireworks/models/llama-v3p1-8b-instruct`.

## The 41 Neuropsychological Concepts

### Cognitive Functions (Core Learning)
1. **Working Memory** - Holding and manipulating information temporarily
2. **Long-term Memory** - Storing and retrieving information permanently
3. **Attention Control** - Focusing cognitive resources selectively
4. **Processing Speed** - Speed of cognitive operations
5. **Executive Planning** - Planning and organizing complex tasks
6. **Cognitive Flexibility** - Switching between different mental tasks
7. **Inhibitory Control** - Suppressing inappropriate responses
8. **Pattern Recognition** - Identifying regularities in information
9. **Spatial Reasoning** - Understanding spatial relationships
10. **Sequential Processing** - Processing information in order
11. **Simultaneous Processing** - Processing multiple pieces of information at once
12. **Verbal Reasoning** - Understanding and using language logically
13. **Perceptual Organization** - Organizing visual information meaningfully

### Learning & Adaptation
14. **Procedural Learning** - Learning motor and cognitive skills
15. **Declarative Learning** - Learning facts and events
16. **Transfer Learning** - Applying knowledge to new situations
17. **Metacognition** - Awareness of one's own thinking processes
18. **Error Detection** - Identifying and correcting mistakes
19. **Strategy Formation** - Developing approaches to solve problems
20. **Concept Formation** - Building abstract representations
21. **Category Learning** - Grouping items based on similarities
22. **Rule Learning** - Understanding and applying rules
23. **Associative Learning** - Linking different pieces of information

### Performance & Monitoring
24. **Response Monitoring** - Tracking the accuracy of responses
25. **Cognitive Load Management** - Managing mental effort and resources
26. **Task Switching** - Changing between different activities
27. **Sustained Attention** - Maintaining focus over time
28. **Selective Attention** - Focusing on relevant information
29. **Divided Attention** - Managing multiple tasks simultaneously
30. **Mental Rotation** - Rotating objects mentally in space
31. **Visual-Spatial Working Memory** - Temporarily holding spatial information
32. **Phonological Processing** - Processing speech sounds
33. **Semantic Processing** - Understanding meaning of words/concepts

### Social & Emotional Intelligence
34. **Theory of Mind** - Understanding others' mental states
35. **Emotional Regulation** - Managing emotional responses
36. **Social Cognition** - Understanding social situations
37. **Empathy** - Understanding and sharing others' emotions
38. **Perspective Taking** - Seeing situations from others' viewpoints
39. **Decision Making** - Choosing between alternatives
40. **Risk Assessment** - Evaluating potential outcomes
41. **Impulse Control** - Resisting immediate temptations

## Intent Classification Categories

### Primary Intent Categories
1. **Canvas Drawing/Visualization** - User wants to create, draw, or visualize something
2. **Math Problem Solving** - User needs help with mathematical concepts or calculations
3. **Educational Content** - User seeks learning material or explanations
4. **Socratic Questioning** - User engages in guided discovery learning
5. **Assessment/Testing** - User wants to test knowledge or skills
6. **Game Recommendation** - User wants educational game suggestions
7. **Progress Tracking** - User wants to see learning progress or analytics
8. **General Conversation** - User engages in casual or general discussion
9. **Tool Usage** - User wants to use specific system tools or features
10. **Neuropsych Analysis** - User seeks understanding of cognitive processes

### Neuropsych-Specific Sub-Intents
- **Memory Training** - Activities focused on working memory, long-term memory
- **Attention Building** - Tasks for attention control, sustained attention, selective attention
- **Executive Function** - Planning, cognitive flexibility, inhibitory control exercises
- **Problem Solving** - Pattern recognition, reasoning, strategy formation tasks
- **Learning Assessment** - Evaluating procedural learning, declarative learning, transfer learning
- **Cognitive Monitoring** - Metacognition, error detection, response monitoring activities

## JSONL Generation Prompts

### Prompt 1: Basic Intent Classification Training Data

```
You are creating training data for an intent classification model for NeuraPlay, an educational platform that tracks student progress using 41 neuropsychological concepts. Generate JSONL format training examples where each line contains:

{
  "input": "user message",
  "output": {
    "intent": "primary_intent",
    "sub_intent": "specific_sub_intent",
    "neuropsych_concepts": ["concept1", "concept2"],
    "confidence": 0.95,
    "suggested_tool": "tool_name",
    "educational_context": "context_description"
  }
}

Primary intents: canvas_drawing, math_problem_solving, educational_content, socratic_questioning, assessment_testing, game_recommendation, progress_tracking, general_conversation, tool_usage, neuropsych_analysis

Neuropsych concepts to focus on: working_memory, attention_control, executive_planning, cognitive_flexibility, pattern_recognition, spatial_reasoning, metacognition, error_detection, strategy_formation, concept_formation, transfer_learning, problem_solving

Tools available: create_math_diagram, generate_image, scribble_chart_create, web_search, get_weather, navigate_to_page, recommend_game

Generate 20 diverse examples covering different age groups (3-5, 6-8, 9-12, 13+) and learning scenarios.
```

### Prompt 2: Socratic Questioning & Discovery Learning

```
Generate JSONL training data specifically for Socratic questioning and discovery learning scenarios in NeuraPlay. Each entry should show how user questions or statements should trigger guided discovery rather than direct answers.

Format:
{
  "input": "user_statement",
  "output": {
    "intent": "socratic_questioning",
    "sub_intent": "guided_discovery",
    "neuropsych_concepts": ["metacognition", "concept_formation"],
    "confidence": 0.90,
    "socratic_approach": "question_back",
    "suggested_response_type": "exploratory_question",
    "educational_depth": "age_appropriate",
    "montessori_principle": "self_directed_discovery"
  }
}

Focus on these neuropsych concepts for Socratic learning:
- metacognition (thinking about thinking)
- concept_formation (building understanding)
- transfer_learning (applying knowledge)
- error_detection (learning from mistakes)
- strategy_formation (developing approaches)
- cognitive_flexibility (considering alternatives)

Create examples where users:
1. Make incorrect assumptions
2. Ask for direct answers when discovery would be better
3. Show partial understanding
4. Express confusion or frustration
5. Demonstrate readiness for deeper exploration

Generate 15 examples across different subjects (math, science, language, social studies).
```

### Prompt 3: Canvas & Visual Learning Integration

```
Create JSONL training data for visual learning and canvas integration scenarios in NeuraPlay. Focus on when users want to create, visualize, or interact with visual content.

Format:
{
  "input": "user_request",
  "output": {
    "intent": "canvas_drawing",
    "sub_intent": "visual_learning",
    "neuropsych_concepts": ["spatial_reasoning", "visual_spatial_working_memory"],
    "confidence": 0.92,
    "suggested_tool": "scribble_chart_create",
    "canvas_action": "create_visualization",
    "visual_type": "diagram/chart/drawing",
    "learning_objective": "spatial_understanding",
    "interactive_elements": ["zoom", "rotate", "annotate"]
  }
}

Neuropsych concepts for visual learning:
- spatial_reasoning
- visual_spatial_working_memory
- pattern_recognition
- perceptual_organization
- mental_rotation
- simultaneous_processing
- concept_formation

User request types to cover:
1. "Draw me a diagram of..."
2. "Show me how X looks like"
3. "I want to create a chart for..."
4. "Can you visualize this data?"
5. "Make an interactive graph of..."
6. "I need a 3D model of..."
7. "Help me organize this information visually"

Generate 12 examples covering different subject areas and complexity levels.
```

### Prompt 4: Assessment & Progress Tracking

```
Generate JSONL training data for assessment and progress tracking scenarios in NeuraPlay, focusing on how the system should understand when users want to test knowledge, check progress, or analyze their cognitive development.

Format:
{
  "input": "user_query",
  "output": {
    "intent": "assessment_testing",
    "sub_intent": "progress_evaluation",
    "neuropsych_concepts": ["response_monitoring", "metacognition"],
    "confidence": 0.88,
    "assessment_type": "formative/summative/diagnostic",
    "tracked_skills": ["working_memory", "attention_control"],
    "performance_indicators": ["accuracy", "speed", "strategy_use"],
    "feedback_type": "immediate/delayed/analytical",
    "next_steps": "recommendation_for_improvement"
  }
}

Assessment-related neuropsych concepts:
- response_monitoring (checking own performance)
- metacognition (awareness of learning)
- error_detection (finding mistakes)
- cognitive_load_management (managing mental effort)
- transfer_learning (applying skills to new contexts)
- strategy_formation (developing better approaches)
- sustained_attention (maintaining focus during tests)

User scenarios:
1. "How am I doing in math?"
2. "Test my knowledge of..."
3. "Am I getting better at..."
4. "Show me my progress over time"
5. "What should I work on next?"
6. "I want to see my cognitive strengths"
7. "Check if I understand this concept"

Generate 10 examples covering different assessment needs and age groups.
```

### Prompt 5: Game Recommendation & Engagement

```
Create JSONL training data for game recommendation scenarios in NeuraPlay, focusing on matching educational games to specific neuropsychological development needs and learning goals.

Format:
{
  "input": "user_request",
  "output": {
    "intent": "game_recommendation",
    "sub_intent": "targeted_skill_development",
    "neuropsych_concepts": ["working_memory", "attention_control"],
    "confidence": 0.91,
    "suggested_tool": "recommend_game",
    "target_age_group": "6-8",
    "difficulty_level": "progressive",
    "game_category": "memory_training",
    "learning_objectives": ["improve_attention", "enhance_memory"],
    "engagement_factors": ["interactive", "reward_based", "adaptive"]
  }
}

Game-focused neuropsych concepts:
- working_memory (memory games)
- attention_control (focus games)
- cognitive_flexibility (puzzle games)
- processing_speed (timed challenges)
- pattern_recognition (matching games)
- spatial_reasoning (building games)
- executive_planning (strategy games)
- impulse_control (delayed gratification games)

User request patterns:
1. "I want to improve my memory"
2. "Suggest games for better focus"
3. "What games help with math skills?"
4. "I need something challenging but fun"
5. "Games for my 7-year-old to practice attention"
6. "Something to help with problem-solving"
7. "Interactive games for spatial skills"

Generate 8 examples covering different cognitive skills and age ranges.
```

### Prompt 6: Frustration & Emotional State Detection

```
Generate JSONL training data for detecting user frustration, confusion, or emotional states that require special handling in NeuraPlay's educational environment.

Format:
{
  "input": "user_expression",
  "output": {
    "intent": "emotional_support",
    "sub_intent": "frustration_management",
    "neuropsych_concepts": ["emotional_regulation", "impulse_control"],
    "confidence": 0.85,
    "emotional_state": "frustrated/confused/overwhelmed",
    "intervention_type": "supportive/redirective/encouraging",
    "suggested_approach": "break_down_task",
    "tone_adjustment": "more_supportive",
    "safety_priority": "high"
  }
}

Emotional regulation neuropsych concepts:
- emotional_regulation
- impulse_control
- stress_management
- cognitive_load_management
- sustained_attention
- response_monitoring
- metacognition

Frustration signals to detect:
1. "This is too hard"
2. "I don't understand anything"
3. "Why isn't this working?"
4. "I give up"
5. "This is stupid"
6. "I can't do this"
7. "Just give me the answer"
8. "I'm tired of trying"

Generate 12 examples showing different frustration levels and appropriate responses.
```

### Prompt 7: Complex Multi-Modal Interactions

```
Create JSONL training data for complex scenarios where users want to combine multiple tools and modalities (text, visual, audio, interactive elements) in NeuraPlay.

Format:
{
  "input": "complex_user_request",
  "output": {
    "intent": "multi_modal_learning",
    "sub_intent": "integrated_experience",
    "neuropsych_concepts": ["simultaneous_processing", "cognitive_flexibility"],
    "confidence": 0.87,
    "required_tools": ["create_math_diagram", "scribble_chart_create"],
    "interaction_sequence": ["visual_first", "then_interactive", "finally_assessment"],
    "modalities": ["visual", "auditory", "kinesthetic"],
    "learning_style_adaptation": "multimodal_preference",
    "complexity_level": "high"
  }
}

Multi-modal neuropsych concepts:
- simultaneous_processing
- cognitive_flexibility
- divided_attention
- working_memory
- visual_spatial_working_memory
- sequential_processing
- transfer_learning

Complex request examples:
1. "Create a visual chart, let me interact with it, then test my understanding"
2. "I want to see, hear, and practice this concept"
3. "Show me a diagram, then let me draw my own version"
4. "Create an interactive lesson with multiple ways to explore"
5. "I need visual, text, and hands-on elements"

Generate 6 examples of sophisticated learning scenarios.
```

## Usage Instructions

1. **Use these prompts sequentially** to generate comprehensive training data
2. **Aim for 100-200 total JSONL entries** across all categories
3. **Balance the dataset** - ensure even distribution across age groups and concepts
4. **Validate the output** - check that generated examples are realistic and educationally sound
5. **Fine-tune iteratively** - start with a subset, test, then expand
6. **Monitor performance** - track how well the model classifies real user interactions

## Model Training Parameters

- **Model**: `accounts/fireworks/models/llama-v3p1-8b-instruct`
- **Training method**: Fine-tuning on intent classification
- **Dataset size**: 100-200 JSONL entries
- **Validation split**: 80/20 train/test
- **Evaluation metrics**: Accuracy, precision, recall for each intent class
- **Safety guardrails**: Built-in content filtering for educational appropriateness

## Expected Outcomes

The fine-tuned model should be able to:
1. **Accurately classify user intents** with 90%+ accuracy
2. **Identify relevant neuropsych concepts** being exercised
3. **Suggest appropriate tools and approaches** for each interaction
4. **Detect emotional states** requiring special handling
5. **Adapt responses** based on age group and complexity level
6. **Route complex requests** to appropriate multi-modal experiences
