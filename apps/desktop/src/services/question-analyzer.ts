/**
 * Question Analyzer Service
 * Определяет тип вопроса и предлагает оптимальную стратегию ответа
 */

export type QuestionType =
  | "technical" // Технический вопрос
  | "behavioral" // Поведенческий вопрос
  | "algorithm" // Алгоритмическая задача
  | "system-design" // System design
  | "coding" // Coding challenge
  | "database" // База данных
  | "general"; // Общий вопрос

export interface QuestionAnalysis {
  type: QuestionType;
  confidence: number; // 0-1
  keywords: string[];
  suggestedStructure: string;
  estimatedComplexity: "easy" | "medium" | "hard";
}

export class QuestionAnalyzer {
  /**
   * Анализирует вопрос и определяет его тип
   */
  analyze(question: string): QuestionAnalysis {
    const lowerQuestion = question.toLowerCase();

    // Ключевые слова для разных типов вопросов
    const patterns = {
      behavioral: [
        "расскажите о",
        "опишите ситуацию",
        "как вы справились",
        "приведите пример",
        "tell me about",
        "describe a time",
        "give an example",
        "конфликт",
        "команда",
        "лидерство",
      ],
      algorithm: [
        "алгоритм",
        "сложность",
        "o(n)",
        "big o",
        "оптимизировать",
        "отсортировать",
        "найти",
        "algorithm",
        "complexity",
        "optimize",
        "sort",
        "search",
      ],
      systemDesign: [
        "спроектируйте",
        "архитектура",
        "масштабирование",
        "design a system",
        "architecture",
        "scalability",
        "микросервисы",
        "microservices",
        "load balancer",
      ],
      coding: [
        "напишите функцию",
        "реализуйте",
        "код",
        "write a function",
        "implement",
        "code",
        "программа",
        "решение",
      ],
      database: [
        "sql",
        "база данных",
        "запрос",
        "индекс",
        "транзакция",
        "database",
        "query",
        "index",
        "transaction",
        "join",
      ],
      technical: [
        "что такое",
        "как работает",
        "объясните",
        "разница между",
        "what is",
        "how does",
        "explain",
        "difference between",
      ],
    };

    // Подсчет совпадений для каждого типа
    const scores: Record<string, number> = {};

    for (const [type, keywords] of Object.entries(patterns)) {
      scores[type] = keywords.filter((keyword) =>
        lowerQuestion.includes(keyword)
      ).length;
    }

    // Определение типа с наибольшим score
    const maxScore = Math.max(...Object.values(scores));
    const detectedType =
      (Object.keys(scores).find(
        (key) => scores[key] === maxScore
      ) as QuestionType) || "general";

    // Извлечение ключевых слов
    const keywords = this.extractKeywords(question);

    // Определение сложности
    const complexity = this.estimateComplexity(question, detectedType);

    // Предложение структуры ответа
    const structure = this.suggestStructure(detectedType);

    return {
      type: detectedType,
      confidence: maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.5,
      keywords,
      suggestedStructure: structure,
      estimatedComplexity: complexity,
    };
  }

  /**
   * Извлекает ключевые слова из вопроса
   */
  private extractKeywords(question: string): string[] {
    // Технические термины
    const technicalTerms = [
      "react",
      "vue",
      "angular",
      "node",
      "python",
      "java",
      "typescript",
      "javascript",
      "api",
      "rest",
      "graphql",
      "database",
      "sql",
      "nosql",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "microservices",
      "монолит",
      "архитектура",
    ];

    const words = question.toLowerCase().split(/\s+/);
    return words.filter((word) =>
      technicalTerms.some((term) => word.includes(term))
    );
  }

  /**
   * Оценивает сложность вопроса
   */
  private estimateComplexity(
    question: string,
    type: QuestionType
  ): "easy" | "medium" | "hard" {
    const lowerQuestion = question.toLowerCase();

    // Индикаторы сложности
    const hardIndicators = [
      "оптимизируйте",
      "масштабируемость",
      "распределенная",
      "микросервисы",
      "optimize",
      "scalability",
      "distributed",
      "microservices",
    ];

    const mediumIndicators = [
      "реализуйте",
      "спроектируйте",
      "архитектура",
      "implement",
      "design",
      "architecture",
    ];

    if (hardIndicators.some((indicator) => lowerQuestion.includes(indicator))) {
      return "hard";
    }

    if (
      mediumIndicators.some((indicator) => lowerQuestion.includes(indicator))
    ) {
      return "medium";
    }

    // System design обычно сложнее
    if (type === "system-design") {
      return "hard";
    }

    return "easy";
  }

  /**
   * Предлагает структуру ответа в зависимости от типа вопроса
   */
  private suggestStructure(type: QuestionType): string {
    const structures: Record<QuestionType, string> = {
      behavioral:
        "STAR method: Situation (ситуация) → Task (задача) → Action (действие) → Result (результат)",
      algorithm:
        "1. Понимание задачи\n2. Примеры\n3. Подход и сложность\n4. Реализация\n5. Оптимизация",
      "system-design":
        "1. Требования\n2. Оценка масштаба\n3. High-level design\n4. Детальный дизайн\n5. Bottlenecks",
      coding:
        "1. Понимание задачи\n2. Edge cases\n3. Решение\n4. Тестирование",
      database:
        "1. Структура данных\n2. Запрос\n3. Индексы\n4. Оптимизация",
      technical: "1. Определение\n2. Как работает\n3. Примеры\n4. Best practices",
      general: "1. Краткий ответ\n2. Детали\n3. Примеры",
    };

    return structures[type];
  }

  /**
   * Генерирует улучшенный промпт на основе анализа
   */
  generatePrompt(question: string, analysis: QuestionAnalysis): string {
    const basePrompt = `Вопрос на собеседовании (тип: ${analysis.type}, сложность: ${analysis.estimatedComplexity}):\n"${question}"\n\n`;

    const structureGuide = `Структура ответа:\n${analysis.suggestedStructure}\n\n`;

    const instructions = this.getInstructionsForType(analysis.type);

    return basePrompt + structureGuide + instructions;
  }

  /**
   * Получает специфичные инструкции для типа вопроса
   */
  private getInstructionsForType(type: QuestionType): string {
    const instructions: Record<QuestionType, string> = {
      behavioral:
        "Дай краткий пример с использованием STAR method. Фокус на конкретных действиях и измеримых результатах. Максимум 3-4 предложения.",
      algorithm:
        "Объясни подход, укажи временную и пространственную сложность. Если возможно, предложи оптимизацию. Будь кратким.",
      "system-design":
        "Дай high-level overview архитектуры. Упомяни ключевые компоненты и их взаимодействие. Укажи на потенциальные bottlenecks.",
      coding:
        "Дай краткое описание решения с псевдокодом или ключевыми моментами реализации. Упомяни edge cases.",
      database:
        "Дай пример SQL запроса или структуры таблиц. Упомяни индексы для оптимизации.",
      technical:
        "Дай четкое определение, объясни как работает, приведи 1-2 примера использования. Будь кратким и точным.",
      general:
        "Дай краткий, но полный ответ. Структурируй информацию в виде bullet points если возможно.",
    };

    return instructions[type];
  }
}
