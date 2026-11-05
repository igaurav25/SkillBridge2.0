const Assessment = require('../models/Assessment');
const LearningRoadmap = require('../models/LearningRoadmap');
const ProjectRecommendation = require('../models/ProjectRecommendation');
const Achievement = require('../models/Achievement');

const assessmentsData = [
  {
    title: 'Core Programming & Algorithm Mastery',
    category: 'Programming',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    description: 'Assess foundational programming concepts, scoping, recursion, and object-oriented principles.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'What is the primary difference between synchronous and asynchronous code execution?',
        options: [
          'Synchronous code blocks further execution until finished; asynchronous code allows other tasks to run while waiting.',
          'Synchronous code is faster than asynchronous code in all situations.',
          'Asynchronous code can only run in multi-threaded hardware environments.',
          'Synchronous code cannot throw uncaught runtime exceptions.'
        ],
        correctOptionIndex: 0,
        explanation: 'Synchronous execution is blocking, whereas asynchronous execution yields control to the event loop or scheduler.',
        skill: 'Async Programming',
        difficulty: 'Beginner'
      },
      {
        questionText: 'What is a closure in modern programming languages like JavaScript and Python?',
        options: [
          'A mechanism to immediately terminate a function execution.',
          'A function that retains access to variables from its lexical enclosing scope even after the outer function has returned.',
          'A private class constructor that cannot be subclassed.',
          'A syntax error caused by unclosed parentheses.'
        ],
        correctOptionIndex: 1,
        explanation: 'Closures bundle a function with references to its surrounding lexical state.',
        skill: 'Language Internals',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'What is the time complexity of searching an element in a balanced Binary Search Tree (AVL/Red-Black)?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctOptionIndex: 1,
        explanation: 'In balanced BSTs, tree height is bounded by O(log n), making search, insertion, and deletion logarithmic.',
        skill: 'Data Structures',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'Which SOLID design principle states that software entities should be open for extension, but closed for modification?',
        options: ['Single Responsibility Principle', 'Open/Closed Principle', 'Liskov Substitution Principle', 'Dependency Inversion Principle'],
        correctOptionIndex: 1,
        explanation: 'The Open/Closed Principle (OCP) encourages extending behavior through inheritance or polymorphism rather than altering existing code.',
        skill: 'OOP & Architecture',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'In memory management, what problem does a Garbage Collector solve?',
        options: [
          'It compiles bytecode into machine instructions.',
          'It automatically reclaims heap memory that is no longer referenced by the program.',
          'It synchronizes shared memory between distributed servers.',
          'It encrypts sensitive memory addresses in RAM.'
        ],
        correctOptionIndex: 1,
        explanation: 'Garbage collectors track reference graphs and free unreachable heap objects to prevent memory leaks.',
        skill: 'Memory Management',
        difficulty: 'Intermediate'
      }
    ]
  },
  {
    title: 'Modern Web Development & Frameworks',
    category: 'Web Development',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    description: 'Test modern frontend & backend web technologies including Angular, TypeScript, CSS Grid, and REST APIs.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'In Angular 17+, what are Signals primarily used for?',
        options: [
          'Database querying and ORM mapping.',
          'Fine-grained, reactive state tracking with automatic dependency tracking.',
          'Intercepting network HTTP calls on the client side.',
          'Compiling TypeScript to WebAssembly binary.'
        ],
        correctOptionIndex: 1,
        explanation: 'Angular Signals provide fine-grained reactivity, notifying the template exactly when dependent values mutate without full tree change detection.',
        skill: 'Angular & Reactive UI',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'What does the HTTP 401 status code signify?',
        options: [
          'The server cannot find the requested resource.',
          'The request requires user authentication credentials.',
          'The server is overloaded and cannot respond.',
          'The resource was permanently moved to a new URI.'
        ],
        correctOptionIndex: 1,
        explanation: 'HTTP 401 Unauthorized indicates that the request lacks valid authentication credentials for the target resource.',
        skill: 'REST APIs',
        difficulty: 'Beginner'
      },
      {
        questionText: 'Which CSS layout system is best suited for two-dimensional grid layouts with rows and columns?',
        options: ['CSS Flexbox', 'CSS Grid Layout', 'Float and Clearfix', 'Inline-block with percentage margins'],
        correctOptionIndex: 1,
        explanation: 'CSS Grid is designed for simultaneous two-dimensional row and column layouts, whereas Flexbox is one-dimensional.',
        skill: 'CSS3 Layout',
        difficulty: 'Beginner'
      },
      {
        questionText: 'What is the purpose of CORS (Cross-Origin Resource Sharing)?',
        options: [
          'To compress HTTP payload bodies using Gzip/Brotli.',
          'A browser security mechanism that allows or restricts resources requested from another domain.',
          'A load-balancing protocol for distributed database replicas.',
          'A protocol to stream real-time video over UDP.'
        ],
        correctOptionIndex: 1,
        explanation: 'CORS is a browser security mechanism that uses HTTP headers to tell browsers whether a web application running at one origin has permission to access resources from a different origin.',
        skill: 'Web Security',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'Why is TypeScript preferred over plain JavaScript for large-scale enterprise applications?',
        options: [
          'TypeScript runs directly in CPU registers without needing any browser engine.',
          'TypeScript introduces compile-time static type checking, interface definitions, and IDE refactoring safety.',
          'TypeScript eliminates the need for unit testing or integration testing.',
          'TypeScript programs have zero memory footprint.'
        ],
        correctOptionIndex: 1,
        explanation: 'TypeScript adds compile-time types that detect errors early and enhance developer tooling and maintainability.',
        skill: 'TypeScript',
        difficulty: 'Beginner'
      }
    ]
  },
  {
    title: 'Database Architecture & SQL/NoSQL',
    category: 'Database Management',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    description: 'Evaluate relational database indexing, ACID properties, NoSQL modeling, and transaction management.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'What does the ACID acronym stand for in relational database management systems?',
        options: [
          'Accuracy, Consistency, Integrity, Durability',
          'Atomicity, Consistency, Isolation, Durability',
          'Asynchronous, Concurrency, Indexing, Data',
          'Availability, Consistency, Isolation, Distribution'
        ],
        correctOptionIndex: 1,
        explanation: 'ACID guarantees that database transactions are processed reliably.',
        skill: 'Database Foundations',
        difficulty: 'Beginner'
      },
      {
        questionText: 'What is the primary benefit of creating a B-Tree index on a frequently queried database column?',
        options: [
          'It reduces table storage footprint on disk.',
          'It transforms table scan searches from O(n) linear scans into O(log n) logarithmic lookups.',
          'It automatically encrypts the column data.',
          'It removes duplicate records automatically.'
        ],
        correctOptionIndex: 1,
        explanation: 'Indexes provide efficient tree lookups, avoiding full table scans on large tables.',
        skill: 'Indexing & Performance',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'When is a document-oriented NoSQL database (like MongoDB) typically preferred over a traditional relational database?',
        options: [
          'When strict multi-table foreign key constraints and financial ledger ACID transactions are primary.',
          'When handling rapidly evolving schemas, hierarchical nested data, and high-throughput horizontal sharding.',
          'When zero RAM is available for database caching.',
          'When SQL standard syntax must be enforced across all legacy reporting tools.'
        ],
        correctOptionIndex: 1,
        explanation: 'Document stores excel at dynamic schemas, denormalized nested structures, and horizontal scalability.',
        skill: 'NoSQL Architecture',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'What is database normalization (e.g. 3NF) intended to minimize?',
        options: [
          'Query execution speed.',
          'Data redundancy and undesirable update/delete anomalies.',
          'The number of database connections.',
          'Network packet transmission size.'
        ],
        correctOptionIndex: 1,
        explanation: 'Normalization organizes columns and tables to reduce duplicated data and ensure data dependencies make sense.',
        skill: 'Schema Design',
        difficulty: 'Intermediate'
      }
    ]
  },
  {
    title: 'Data Structures & Algorithmic Complexity',
    category: 'Data Structures',
    difficulty: 'Advanced',
    durationMinutes: 20,
    description: 'Deep dive into algorithmic complexity, graph traversals, dynamic programming, and heaps.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'Which data structure is optimal for implementing a Breadth-First Search (BFS) graph traversal?',
        options: ['Stack (LIFO)', 'Queue (FIFO)', 'Binary Heap', 'Hash Set'],
        correctOptionIndex: 1,
        explanation: 'BFS explores neighbor nodes level by level using a First-In-First-Out (FIFO) queue.',
        skill: 'Graph Algorithms',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'What is the average and worst-case time complexity of QuickSort?',
        options: [
          'Average: O(n log n), Worst: O(n²)',
          'Average: O(n), Worst: O(n log n)',
          'Average: O(n log n), Worst: O(n log n)',
          'Average: O(n²), Worst: O(n²)'
        ],
        correctOptionIndex: 0,
        explanation: 'QuickSort divides in O(n log n) average time, but degenerates to O(n²) when bad pivots (e.g. already sorted) are picked without randomization.',
        skill: 'Sorting & Complexity',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'What fundamental property defines a Min-Heap binary tree?',
        options: [
          'Every node is smaller than its parent.',
          'The key of the root node is less than or equal to all its descendants, and this holds recursively for all subtrees.',
          'Left subtree keys are always greater than right subtree keys.',
          'The tree is strictly balanced with equal left and right depths.'
        ],
        correctOptionIndex: 1,
        explanation: 'In a Min-Heap, parent nodes are always less than or equal to their children, ensuring O(1) minimum extraction.',
        skill: 'Heaps & Priority Queues',
        difficulty: 'Advanced'
      }
    ]
  },
  {
    title: 'Computer Science Fundamentals & OS',
    category: 'Computer Science Fundamentals',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    description: 'Processes vs threads, virtual memory, TCP/IP networking, and concurrency synchronization.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'What is the core distinction between a process and a thread?',
        options: [
          'A process is an independent executing program with its own address space; threads share the memory space of their parent process.',
          'A thread runs on CPU hardware, while processes only run on virtual machines.',
          'Threads cannot be interrupted by the operating system scheduler.',
          'Processes cannot communicate with each other over networks.'
        ],
        correctOptionIndex: 0,
        explanation: 'Processes have isolated memory spaces; threads within the same process share heap and global memory.',
        skill: 'Operating Systems',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'In the TCP/IP suite, what makes TCP a reliable transport protocol compared to UDP?',
        options: [
          'TCP encrypts all packets with TLS by default.',
          'TCP guarantees ordered, error-checked packet delivery through sequence numbers, acknowledgments, and retransmission.',
          'TCP has zero handshake latency.',
          'TCP packets bypass physical network switches.'
        ],
        correctOptionIndex: 1,
        explanation: 'TCP uses 3-way handshakes, sequence numbers, checksums, and flow control to guarantee delivery.',
        skill: 'Computer Networking',
        difficulty: 'Intermediate'
      }
    ]
  },
  {
    title: 'Problem Solving & Critical Thinking',
    category: 'Problem Solving',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    description: 'System debugging, root cause analysis, edge-case mitigation, and architectural reasoning.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'When troubleshooting a sudden spike in latency in a microservices architecture, what is the best first step?',
        options: [
          'Immediately delete all database indices.',
          'Inspect distributed tracing logs (e.g. OpenTelemetry) and telemetry metrics to isolate which service is bottlenecked.',
          'Reboot all cluster nodes simultaneously.',
          'Rewrite backend services in a different programming language.'
        ],
        correctOptionIndex: 1,
        explanation: 'Distributed tracing pinpoints exactly where requests spend time across service hops without guessing.',
        skill: 'System Debugging',
        difficulty: 'Intermediate'
      },
      {
        questionText: 'What strategy best prevents the "Thundering Herd" problem when caching expensive database query results?',
        options: [
          'Cache probabilistic early expiration or mutual exclusion locking (mutex) on cache misses.',
          'Disable caching entirely.',
          'Set cache TTL to infinite for all queries.',
          'Increase frontend polling frequency.'
        ],
        correctOptionIndex: 0,
        explanation: 'Locking or early pre-computation prevents hundreds of concurrent requests from overwhelming the database simultaneously.',
        skill: 'System Scalability',
        difficulty: 'Advanced'
      }
    ]
  },
  {
    title: 'Professional Communication & Team Dynamics',
    category: 'Communication Skills',
    difficulty: 'Beginner',
    durationMinutes: 10,
    description: 'Code review etiquette, stakeholder communication, cross-functional collaboration, and agile standups.',
    passingPercentage: 70,
    questions: [
      {
        questionText: 'When giving constructive feedback during a peer code review, which approach is most effective?',
        options: [
          'Point out flaws without providing alternatives or rationale.',
          'Frame comments around code principles and architecture, explain the "why", and suggest concrete improvements collaboratively.',
          'Reject the PR immediately without leaving comments.',
          'Only review syntax formatting and ignore logic errors.'
        ],
        correctOptionIndex: 1,
        explanation: 'Effective code reviews are collaborative and objective, explaining the reasoning behind requested changes.',
        skill: 'Code Review & Collaboration',
        difficulty: 'Beginner'
      },
      {
        questionText: 'What is the primary purpose of a daily Agile Standup meeting?',
        options: [
          'To justify individual employment hours to management.',
          'To briefly share progress, planned tasks for the day, and flag immediate blockers for team synchronization.',
          'To conduct detailed code reviews and deep architectural debates.',
          'To assign blame for sprint delays.'
        ],
        correctOptionIndex: 1,
        explanation: 'Standups keep teams aligned on daily progress and help surface blockers quickly.',
        skill: 'Agile & Team Dynamics',
        difficulty: 'Beginner'
      }
    ]
  }
];

const roadmapsData = [
  {
    role: 'Frontend Developer',
    domain: 'Web Development',
    description: 'Complete roadmap from semantic HTML/CSS to advanced Angular architecture, state management, and web performance.',
    levels: [
      {
        levelName: 'Beginner',
        description: 'Foundations of web presentation, styling, responsive layouts, and modern ECMAScript.',
        topics: [
          { topicId: 'fe_html_css', title: 'HTML5 Semantics & CSS3 Flexbox/Grid', estimatedHours: 12, description: 'Master semantic web structure, responsive media queries, and modern flex/grid layouts.' },
          { topicId: 'fe_js_es6', title: 'Modern JavaScript (ES6+)', estimatedHours: 16, description: 'Variables, arrow functions, destructuring, promises, async/await, and event handling.' },
          { topicId: 'fe_git', title: 'Git & GitHub Version Control', estimatedHours: 6, description: 'Branching strategies, pull requests, resolving merge conflicts, and commit hygiene.' }
        ],
        projectMilestone: {
          title: 'Responsive SaaS Landing Page',
          description: 'Build a mobile-first, dark/light theme landing page with accessible semantic markup.',
          skills: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Design']
        }
      },
      {
        levelName: 'Intermediate',
        description: 'Component architecture, reactive signals, client routing, and REST API integration.',
        topics: [
          { topicId: 'fe_ts', title: 'TypeScript for Scale', estimatedHours: 14, description: 'Interfaces, type aliases, generics, union types, and strict mode compliance.' },
          { topicId: 'fe_angular_core', title: 'Angular Components & Signals', estimatedHours: 20, description: 'Standalone components, reactive inputs/outputs, signals, and inject-based DI.' },
          { topicId: 'fe_api_rx', title: 'HTTP Client & RxJS Operators', estimatedHours: 12, description: 'Handling API calls, error catching, mapping, debouncing searches, and caching.' }
        ],
        projectMilestone: {
          title: 'Interactive Job Board Dashboard',
          description: 'Develop a dynamic job portal frontend with live search filtering, pagination, and bookmarking.',
          skills: ['Angular', 'TypeScript', 'RxJS', 'REST APIs']
        }
      },
      {
        levelName: 'Advanced',
        description: 'Enterprise state management, testing, Core Web Vitals, and CI/CD.',
        topics: [
          { topicId: 'fe_state', title: 'State Management (NgRx / Signals Store)', estimatedHours: 15, description: 'Global state patterns, actions, selectors, and immutability.' },
          { topicId: 'fe_perf', title: 'Core Web Vitals & Performance Tuning', estimatedHours: 10, description: 'LCP/INP optimization, code splitting, lazy loading, and image optimization.' },
          { topicId: 'fe_testing', title: 'Unit & E2E Testing', estimatedHours: 12, description: 'Writing component tests with Jasmine/Karma and end-to-end user workflows.' }
        ],
        projectMilestone: {
          title: 'Production-Ready Enterprise Dashboard',
          description: 'Full-featured analytics dashboard with charts, auth interceptors, and high accessibility.',
          skills: ['Angular', 'NgRx', 'Web Vitals', 'Testing']
        }
      }
    ]
  },
  {
    role: 'Backend Developer',
    domain: 'Backend Development',
    description: 'Master server-side architectures, RESTful APIs, database design, caching, and containerized deployment.',
    levels: [
      {
        levelName: 'Beginner',
        description: 'Server fundamentals, runtime environments, routing, and basic databases.',
        topics: [
          { topicId: 'be_node_express', title: 'Node.js & Express.js Fundamentals', estimatedHours: 14, description: 'Event loop, middleware pipeline, routing, and environment configurations.' },
          { topicId: 'be_rest_design', title: 'RESTful API Architecture & Validation', estimatedHours: 10, description: 'HTTP verbs, status codes, request validation, and clean error middleware.' },
          { topicId: 'be_mongodb_basics', title: 'MongoDB & Mongoose Modeling', estimatedHours: 12, description: 'Schemas, CRUD operations, relationships, and validation.' }
        ],
        projectMilestone: {
          title: 'User Authentication & Notes REST API',
          description: 'Secure API with JWT authentication, password hashing, and CRUD resource management.',
          skills: ['Node.js', 'Express.js', 'MongoDB', 'JWT']
        }
      },
      {
        levelName: 'Intermediate',
        description: 'Relational data modeling, query optimization, security, and message queues.',
        topics: [
          { topicId: 'be_sql_postgres', title: 'Relational Databases & PostgreSQL', estimatedHours: 16, description: 'Tables, foreign keys, complex JOINs, indexing, and transactions.' },
          { topicId: 'be_security_jwt', title: 'API Security, OAuth & Rate Limiting', estimatedHours: 10, description: 'Protecting endpoints, helmet headers, CORS policies, and brute-force mitigation.' },
          { topicId: 'be_docker', title: 'Docker Containerization', estimatedHours: 12, description: 'Dockerfiles, multi-stage builds, container networks, and Docker Compose.' }
        ],
        projectMilestone: {
          title: 'Containerized E-Commerce Backend Service',
          description: 'Multi-container service with PostgreSQL, Redis caching, and rate-limited order endpoints.',
          skills: ['PostgreSQL', 'Docker', 'Redis', 'Node.js']
        }
      },
      {
        levelName: 'Advanced',
        description: 'Distributed systems, microservices, caching, and CI/CD deployment.',
        topics: [
          { topicId: 'be_microservices', title: 'Microservices & Event-Driven Systems', estimatedHours: 18, description: 'Service decoupling, message brokers (RabbitMQ/Kafka), and idempotency.' },
          { topicId: 'be_redis_caching', title: 'Redis Caching & Distributed Locks', estimatedHours: 8, description: 'Cache invalidation strategies, pub/sub, and session management.' },
          { topicId: 'be_cloud_deploy', title: 'Cloud Infrastructure & Monitoring', estimatedHours: 14, description: 'Deploying containers to AWS/GCP, health probes, and log aggregation.' }
        ],
        projectMilestone: {
          title: 'High-Concurrency Real-Time Platform',
          description: 'Distributed backend with WebSockets, Redis message bus, and automated CI/CD pipeline.',
          skills: ['Microservices', 'Redis', 'WebSockets', 'Cloud']
        }
      }
    ]
  },
  {
    role: 'Full Stack Developer',
    domain: 'Full Stack Development',
    description: 'End-to-end full stack proficiency connecting modern Angular/React frontends with scalable Node.js services.',
    levels: [
      {
        levelName: 'Beginner',
        description: 'Frontend and backend foundations with seamless API integration.',
        topics: [
          { topicId: 'fs_web_basics', title: 'HTML, CSS, JS & Node Fundamentals', estimatedHours: 16, description: 'Client-server model, DOM manipulation, Express routes, and JSON.' },
          { topicId: 'fs_fullstack_crud', title: 'Connecting Angular with Express', estimatedHours: 18, description: 'HTTP clients, CORS handling, data binding, and responsive views.' }
        ],
        projectMilestone: {
          title: 'Full Stack Task & Project Manager',
          description: 'Complete SPA with responsive UI, Node backend, and persistent MongoDB database.',
          skills: ['Angular', 'Node.js', 'MongoDB', 'CSS3']
        }
      },
      {
        levelName: 'Intermediate',
        description: 'Authentication, state management, SQL databases, and containerization.',
        topics: [
          { topicId: 'fs_auth_state', title: 'Full Stack Authentication & Authorization', estimatedHours: 16, description: 'JWT tokens, route guards, interceptors, and user roles.' },
          { topicId: 'fs_sql_nosql', title: 'Polyglot Persistence (SQL + NoSQL)', estimatedHours: 14, description: 'Choosing right storage for analytics, relational data, and documents.' }
        ],
        projectMilestone: {
          title: 'Collaborative Job Application Tracker',
          description: 'Role-based application tracker with interview schedulers and real-time alerts.',
          skills: ['Angular', 'TypeScript', 'Express', 'JWT', 'MongoDB']
        }
      },
      {
        levelName: 'Advanced',
        description: 'DevOps, CI/CD, cloud deployment, and system design.',
        topics: [
          { topicId: 'fs_docker_cicd', title: 'Docker, GitHub Actions & CI/CD', estimatedHours: 15, description: 'Automating build pipelines, test runners, and container deployments.' },
          { topicId: 'fs_sys_design', title: 'Full Stack System Design & Scalability', estimatedHours: 18, description: 'Load balancing, CDN caching, database replication, and zero-downtime releases.' }
        ],
        projectMilestone: {
          title: 'Production SaaS AI Platform',
          description: 'Commercial-grade SaaS with ML recommendation engine, payments, and Docker orchestration.',
          skills: ['Angular', 'Node.js', 'FastAPI', 'Docker', 'AWS']
        }
      }
    ]
  }
];

const projectsData = [
  {
    title: 'AI-Powered Smart Career Recommendation Engine',
    targetRole: 'Full Stack Developer',
    difficulty: 'Intermediate',
    description: 'Build a full stack career portal integrating a Python Scikit-Learn microservice with an Angular frontend and Node.js gateway.',
    requiredTechnologies: ['Angular 19', 'Node.js', 'FastAPI', 'Python', 'Scikit-learn', 'MongoDB'],
    features: [
      'Interactive skill profiling and career match radar visualization',
      'Random Forest ML recommendation with suitability scoring',
      'JWT role-based candidate vs recruiter authentication',
      'Live job application pipeline with status updates'
    ],
    expectedOutcome: 'A portfolio-defining SaaS product demonstrating true full-stack and machine learning collaboration.',
    learningBenefits: 'Master microservice architecture, API gateways, ML model inference, and reactive frontend design.',
    estimatedDuration: '3-4 weeks',
    architectureHighlights: ['Angular Client', 'Express Gateway', 'FastAPI ML Engine', 'Joblib Artifacts']
  },
  {
    title: 'Distributed Real-Time Collaborative Workspace',
    targetRole: 'Backend Developer',
    difficulty: 'Advanced',
    description: 'Engineer a high-throughput collaborative document and task workspace with WebSockets and Redis Pub/Sub.',
    requiredTechnologies: ['Node.js', 'TypeScript', 'WebSockets', 'Redis', 'PostgreSQL', 'Docker'],
    features: [
      'Bidirectional real-time cursor tracking and simultaneous updates',
      'Redis Pub/Sub message broker supporting multi-node clustering',
      'PostgreSQL append-only audit trail and version history',
      'Comprehensive Jest unit test suite covering concurrent operations'
    ],
    expectedOutcome: 'A distributed system demonstrating mastery of concurrency, socket protocols, and caching.',
    learningBenefits: 'Learn low-latency networking, distributed synchronization, and database transaction locks.',
    estimatedDuration: '4 weeks',
    architectureHighlights: ['Socket.io Cluster', 'Redis Adapter', 'PostgreSQL B-Tree Indexes']
  },
  {
    title: 'Accessible Analytics Dashboard with Real-Time Data Streams',
    targetRole: 'Frontend Developer',
    difficulty: 'Intermediate',
    description: 'Craft a responsive, accessible Web Vitals-optimized SaaS dashboard supporting dark/light mode and interactive charts.',
    requiredTechnologies: ['Angular 19', 'TypeScript', 'RxJS', 'CSS Grid', 'Chart.js', 'WCAG 2.1 AA'],
    features: [
      'WCAG 2.1 AA compliant keyboard navigation and high-contrast color scheme',
      'Signals-driven reactive state management with zero unnecessary re-renders',
      'Interactive drill-down metrics, exportable CSV/PDF summaries',
      'Optimized Core Web Vitals (LCP < 1.2s, INP < 100ms)'
    ],
    expectedOutcome: 'A visually stunning frontend portfolio centerpiece highlighting clean code and accessibility.',
    learningBenefits: 'Deep dive into modern Angular Signals, performance budgeting, and user-centric design.',
    estimatedDuration: '2-3 weeks',
    architectureHighlights: ['Angular Signals', 'Custom SVG Visualizations', 'Dynamic Theming']
  },
  {
    title: 'Automated Job Matcher & Resume Keyword Extractor',
    targetRole: 'Machine Learning Engineer',
    difficulty: 'Intermediate',
    description: 'Develop an NLP pipeline that extracts skills from PDF resumes and matches them against job descriptions via TF-IDF & Cosine Similarity.',
    requiredTechnologies: ['Python 3.12', 'FastAPI', 'Scikit-learn', 'Pandas', 'PyPDF', 'Docker'],
    features: [
      'PDF text parser extracting education, skills, and work experience',
      'TF-IDF vectorizer + Cosine Similarity matching engine',
      'Missing keyword identification and ATS score calculation',
      'FastAPI endpoints with Pydantic request validation and Swagger UI'
    ],
    expectedOutcome: 'A robust ML service ready for containerized deployment in talent acquisition pipelines.',
    learningBenefits: 'Gain practical experience in text feature extraction, vector distance metrics, and API serving.',
    estimatedDuration: '2 weeks',
    architectureHighlights: ['TF-IDF Matrix', 'Cosine Metric', 'PyPDF Extraction']
  }
];

const seedNewFeatures = async () => {
  try {
    console.log('[Seed] Seeding SkillBridge 2.0 Assessments, Roadmaps, and Projects...');

    // 1. Seed Assessments
    const existingAssessmentsCount = await Assessment.countDocuments();
    if (existingAssessmentsCount === 0) {
      await Assessment.insertMany(assessmentsData);
      console.log(`[Seed] Inserted ${assessmentsData.length} interactive assessments.`);
    } else {
      console.log(`[Seed] Assessments already present (${existingAssessmentsCount}). Skipping insert.`);
    }

    // 2. Seed Roadmaps
    const existingRoadmapsCount = await LearningRoadmap.countDocuments();
    if (existingRoadmapsCount === 0) {
      await LearningRoadmap.insertMany(roadmapsData);
      console.log(`[Seed] Inserted ${roadmapsData.length} learning roadmaps.`);
    } else {
      console.log(`[Seed] Roadmaps already present (${existingRoadmapsCount}). Skipping insert.`);
    }

    // 3. Seed Projects
    const existingProjectsCount = await ProjectRecommendation.countDocuments();
    if (existingProjectsCount === 0) {
      await ProjectRecommendation.insertMany(projectsData);
      console.log(`[Seed] Inserted ${projectsData.length} project recommendations.`);
    } else {
      console.log(`[Seed] Project recommendations already present (${existingProjectsCount}). Skipping insert.`);
    }

    console.log('[Seed] SkillBridge 2.0 new feature models initialized successfully.');
  } catch (err) {
    console.error('[Seed] Error seeding new features:', err);
  }
};

module.exports = { seedNewFeatures };

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { connectDB } = require('../config/db');
  connectDB().then(() => {
    seedNewFeatures().then(() => process.exit(0));
  });
}

