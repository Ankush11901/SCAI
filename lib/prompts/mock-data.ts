/**
 * Mock Data Sets for Prompt Testing
 *
 * Pre-built data for testing prompts that have dependencies.
 * Each article type has a complete mock data set that can be used
 * to test any prompt without running the full generation chain.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MockDataSet {
  // Basic info
  topic: string
  primaryKeyword: string
  articleType: string
  tone: string
  titleFormat: 'question' | 'statement' | 'listicle'

  // Structure outputs
  h1: string
  h2s: string[]
  closingH2: string
  faqH2: string
  faqQuestions: string[]
  meta: {
    title: string
    description: string
  }
  imageAlts: {
    featured: string
    h2s: string[]
  }

  // Content outputs (for downstream prompts)
  overviewText: string
  sectionTexts: string[]
  closingText: string
  faqAnswers: string[]

  // Component-specific data
  componentData?: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA BY ARTICLE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export const MOCK_DATA: Record<string, MockDataSet> = {
  affiliate: {
    topic: 'Best Wireless Headphones',
    primaryKeyword: 'wireless headphones',
    articleType: 'affiliate',
    tone: 'professional',
    titleFormat: 'statement',

    h1: 'Best Wireless Headphones for Every Budget in 2024',
    h2s: [
      'Sony WH-1000XM5 - Best Overall',
      'Bose QuietComfort Ultra - Premium Pick',
      'Apple AirPods Max - Best for iPhone Users',
      'Sennheiser Momentum 4 - Best Sound Quality',
      'JBL Tune 760NC - Best Value',
    ],
    closingH2: 'Finding Your Perfect Wireless Headphones',
    faqH2: 'Common Questions',
    faqQuestions: [
      'Are wireless headphones worth the extra cost?',
      'How long do wireless headphones last on a charge?',
      'Can I use wireless headphones for gaming?',
    ],
    meta: {
      title: 'Best Wireless Headphones 2024: Top Picks Compared',
      description: 'Discover the best wireless headphones for every budget. Compare top picks from Sony, Bose, Apple, and more. Find your perfect pair today.',
    },
    imageAlts: {
      featured: 'Premium wireless headphones displayed on modern desk with smartphone and laptop showing music streaming apps nearby',
      h2s: [
        'Sony WH-1000XM5 wireless headphones in silver finish showing sleek design and cushioned earcups',
        'Bose QuietComfort Ultra headphones with premium leather accents and advanced noise cancellation',
        'Apple AirPods Max in space gray with Digital Crown and mesh headband design visible',
        'Sennheiser Momentum 4 wireless headphones showcasing premium materials and foldable design',
        'JBL Tune 760NC budget wireless headphones in blue color showing comfortable fit design',
      ],
    },

    overviewText: 'Finding the perfect wireless headphones can be overwhelming with so many options available. We tested over 20 models to bring you the best wireless headphones for every budget and use case.\n\nWhether you prioritize noise cancellation, sound quality, or battery life, our comprehensive guide covers the top picks that deliver exceptional value and performance.',
    sectionTexts: [
      'The Sony WH-1000XM5 stands out as our top recommendation for most people. With industry-leading noise cancellation and exceptional sound quality, these headphones justify their premium price tag.\n\nThe lightweight design and 30-hour battery life make them ideal for daily commuters and frequent travelers. The multipoint connectivity allows seamless switching between devices.\n\nSony\'s companion app offers extensive customization options including EQ adjustments and noise cancellation levels. The speak-to-chat feature automatically pauses music when you start talking.',
    ],
    closingText: 'The best wireless headphones depend on your specific needs and budget. Consider your primary use case and must-have features when making your choice. Happy listening!',
    faqAnswers: [
      'Yes, wireless headphones offer convenience and improved audio technology. Modern models match or exceed wired headphones in sound quality while providing freedom of movement.',
      'Most premium wireless headphones last twenty to thirty hours on a single charge. Budget options typically offer fifteen to twenty hours of playback time.',
      'Many wireless headphones work for gaming with low latency modes. However, dedicated gaming headsets may offer better spatial audio features.',
    ],

    componentData: {
      products: [
        { name: 'Sony WH-1000XM5', price: '$349', badge: 'Best Overall' },
        { name: 'Bose QuietComfort Ultra', price: '$429', badge: 'Premium Pick' },
        { name: 'Apple AirPods Max', price: '$549', badge: 'Best for iPhone' },
      ],
    },
  },

  review: {
    topic: 'PlayStation 5 Console',
    primaryKeyword: 'PS5 review',
    articleType: 'review',
    tone: 'professional',
    titleFormat: 'statement',

    h1: 'PlayStation 5 Review: Is Sony\'s Console Worth It?',
    h2s: [
      'PS5 Design and Build Quality',
      'Gaming Performance Analysis',
      'DualSense Controller Experience',
      'Game Library and Exclusives',
      'Value for Money Assessment',
    ],
    closingH2: 'Our Final Verdict',
    faqH2: 'PS5 Questions',
    faqQuestions: [
      'Is the PS5 better than Xbox Series X?',
      'Should I wait for PS5 Pro?',
      'Can PS5 play PS4 games?',
    ],
    meta: {
      title: 'PlayStation 5 Review 2024: Complete Performance Analysis',
      description: 'Our in-depth PS5 review covers performance, games, and value. Find out if Sony\'s console lives up to the hype. Read our honest verdict now.',
    },
    imageAlts: {
      featured: 'PlayStation 5 console standing vertically on modern entertainment center with DualSense controller and game case nearby',
      h2s: [
        'PlayStation 5 console showing distinctive white panels and blue LED lighting on black background',
        'PS5 running high-fidelity game with vivid 4K HDR graphics displayed on large screen television',
        'DualSense wireless controller in white showing adaptive triggers and haptic feedback features',
        'Collection of PS5 exclusive game cases including popular titles arranged on gaming shelf',
        'PS5 console bundle contents displayed including base unit controller cables and documentation',
      ],
    },

    overviewText: 'The PlayStation 5 marks a significant leap forward for console gaming. With its custom SSD, powerful hardware, and innovative DualSense controller, Sony promises a next-generation experience.\n\nAfter months of extensive testing across dozens of games, we\'re ready to share our complete verdict on whether the PS5 lives up to the considerable hype surrounding it.',
    sectionTexts: [
      'The PS5\'s bold design makes a statement in any entertainment setup. The white panels and black core create a distinctive futuristic aesthetic that polarizes opinions but undeniably stands out.\n\nBuild quality is excellent with solid construction throughout. The console runs quietly during most gaming sessions, a notable improvement over the sometimes jet-engine-loud PS4 Pro.\n\nThe large footprint requires planning for placement, but the included stand allows both vertical and horizontal positioning for flexibility in various setups.',
    ],
    closingText: 'The PlayStation 5 delivers on its next-generation promises with impressive performance and innovative features. The growing game library and enhanced backwards compatibility make it a solid investment.',
    faqAnswers: [
      'Both consoles offer excellent performance with different strengths. PS5 has stronger exclusives while Xbox offers better value through Game Pass subscription service.',
      'Current PS5 delivers excellent performance for years ahead. Waiting for Pro only makes sense if you prioritize absolute maximum graphics fidelity.',
      'Yes, PS5 plays virtually all PS4 games with many receiving performance boosts. Enhanced loading times and frame rates improve the experience.',
    ],

    componentData: {
      productName: 'PlayStation 5',
      pros: [
        'Lightning-fast SSD dramatically reduces load times',
        'DualSense controller\'s haptic feedback adds immersion',
        'Strong exclusive games library',
        'Excellent backwards compatibility with PS4',
        'Quiet operation during most games',
      ],
      cons: [
        'Large size may not fit all entertainment centers',
        'Internal SSD storage fills quickly with modern games',
        'Limited availability of native PS5 titles',
        'Higher price point than competing consoles',
      ],
      rating: { score: 8.5, verdict: 'Excellent' },
    },
  },

  recipe: {
    topic: 'Classic Chocolate Chip Cookies',
    primaryKeyword: 'chocolate chip cookies recipe',
    articleType: 'recipe',
    tone: 'friendly',
    titleFormat: 'statement',

    h1: 'Perfect Chocolate Chip Cookies Recipe',
    h2s: [
      'Essential Cookie Ingredients',
      'Step-by-Step Baking Instructions',
      'Pro Tips for Perfect Cookies',
      'Nutrition Information',
      'Cookie Variations to Try',
    ],
    closingH2: 'Time to Start Baking',
    faqH2: 'Cookie FAQs',
    faqQuestions: [
      'How do I make cookies chewy?',
      'Can I freeze cookie dough?',
      'Why did my cookies turn out flat?',
    ],
    meta: {
      title: 'Perfect Chocolate Chip Cookies Recipe - Soft and Chewy',
      description: 'Bake the perfect chocolate chip cookies with this tried-and-true recipe. Soft, chewy, and loaded with chocolate. Get baking tips and variations.',
    },
    imageAlts: {
      featured: 'Freshly baked chocolate chip cookies cooling on wire rack with golden edges and melted chocolate chips visible',
      h2s: [
        'Cookie baking ingredients arranged on marble counter including flour sugar eggs butter and chocolate chips',
        'Hands shaping chocolate chip cookie dough balls on parchment-lined baking sheet ready for oven',
        'Professional baker demonstrating proper cookie dough consistency with wooden spoon in mixing bowl',
        'Nutrition label card showing calories and macros next to stack of homemade chocolate chip cookies',
        'Assortment of cookie variations including double chocolate walnut and sea salt topped versions',
      ],
    },

    overviewText: 'Nothing beats the smell of freshly baked chocolate chip cookies filling your kitchen. This classic recipe produces perfectly soft and chewy cookies every single time you bake them.\n\nWith simple ingredients and straightforward steps, you\'ll master the art of homemade cookies. These treats disappear fast, so consider making a double batch!',
    sectionTexts: [
      'Quality ingredients make the difference between good and great cookies. Use room temperature butter for proper creaming, which creates that ideal chewy texture we all love.\n\nAll-purpose flour provides the right structure while brown sugar adds moisture and rich flavor. Don\'t skimp on the vanilla extract—it enhances every other flavor beautifully.\n\nChoose quality chocolate chips or chop a chocolate bar for uneven pieces that create delightful pockets of melted chocolate throughout each cookie.',
    ],
    closingText: 'These chocolate chip cookies will become your go-to recipe for bake sales and family gatherings. Start with quality ingredients and follow the tips for guaranteed delicious results!',
    faqAnswers: [
      'Use more brown sugar than white sugar and avoid overbaking. Remove cookies when edges are golden but centers look slightly underdone for chewy results.',
      'Yes, freeze portioned dough balls on a baking sheet then transfer to bags. Bake directly from frozen, adding two minutes to bake time.',
      'Flat cookies usually result from overly soft butter or too little flour. Chill dough for thirty minutes before baking for better shape retention.',
    ],

    componentData: {
      ingredients: [
        { quantity: '2 1/4 cups', name: 'all-purpose flour', notes: 'spooned and leveled' },
        { quantity: '1 cup', name: 'unsalted butter', notes: 'room temperature' },
        { quantity: '3/4 cup', name: 'brown sugar', notes: 'packed' },
        { quantity: '1/2 cup', name: 'granulated sugar' },
        { quantity: '2 large', name: 'eggs', notes: 'room temperature' },
        { quantity: '2 cups', name: 'chocolate chips' },
        { quantity: '1 tsp', name: 'vanilla extract' },
        { quantity: '1 tsp', name: 'baking soda' },
        { quantity: '1/2 tsp', name: 'salt' },
      ],
      servings: 24,
      recipeType: 'dessert',
    },
  },

  'how-to': {
    topic: 'How to Change a Car Tire',
    primaryKeyword: 'change a car tire',
    articleType: 'how-to',
    tone: 'professional',
    titleFormat: 'statement',

    h1: 'How to Change a Car Tire: Complete Guide',
    h2s: [
      'Tools and Materials Needed',
      'Safety Preparations',
      'Removing the Flat Tire',
      'Installing the Spare Tire',
      'Post-Change Checklist',
    ],
    closingH2: 'Stay Prepared on the Road',
    faqH2: 'Tire Change FAQs',
    faqQuestions: [
      'How long can I drive on a spare tire?',
      'What if my lug nuts are stuck?',
      'Should I replace all four tires at once?',
    ],
    meta: {
      title: 'How to Change a Car Tire: Step-by-Step Guide 2024',
      description: 'Learn how to change a car tire safely with our complete guide. Step-by-step instructions, tools needed, and expert tips for roadside emergencies.',
    },
    imageAlts: {
      featured: 'Person safely changing car tire on roadside with jack properly positioned and lug wrench nearby',
      h2s: [
        'Complete tire changing toolkit laid out including jack lug wrench gloves and wheel wedges',
        'Car parked safely on level ground with hazard lights on and reflective triangles placed behind',
        'Mechanic loosening lug nuts in star pattern with tire iron on raised vehicle',
        'Hands aligning spare tire with wheel studs while car remains secured on jack',
        'Driver checking spare tire pressure with gauge after successful tire change',
      ],
    },

    overviewText: 'Knowing how to change a car tire is an essential skill every driver should have. A flat tire can happen anywhere, and being prepared saves time and potential towing costs.\n\nThis comprehensive guide walks you through each step safely and efficiently. With practice, you can complete a tire change in under fifteen minutes.',
    sectionTexts: [
      'Before starting any tire change, gather your tools and ensure you have everything needed. Most vehicles come with a jack, lug wrench, and spare tire stored in the trunk area.\n\nAdditional helpful items include wheel wedges, a flashlight, and work gloves for grip and hand protection. A rain poncho is valuable for wet weather emergencies.\n\nCheck your spare tire pressure periodically during routine maintenance. A flat spare defeats the purpose of carrying one for emergencies.',
    ],
    closingText: 'Changing a car tire is a straightforward process once you know the steps. Practice in your driveway so you\'re confident when an emergency strikes.',
    faqAnswers: [
      'Temporary spare tires should only be used for fifty miles at speeds under fifty mph. Full-size spares can be driven normally until replaced.',
      'Apply penetrating oil and let it soak for several minutes. Use a breaker bar for additional leverage if the lug wrench alone fails.',
      'For optimal handling and safety, replace tires in pairs on the same axle. All four is ideal but pairs work for budget constraints.',
    ],

    componentData: {
      materials: [
        { name: 'Car jack', specs: 'Included with vehicle', optional: false },
        { name: 'Lug wrench', specs: 'Included with vehicle', optional: false },
        { name: 'Spare tire', specs: 'Full-size or temporary', optional: false },
        { name: 'Wheel wedges', specs: 'Rubber or wooden', optional: true },
        { name: 'Work gloves', specs: 'Rubber-coated preferred', optional: true },
        { name: 'Flashlight', specs: 'LED with fresh batteries', optional: true },
      ],
    },
  },

  informational: {
    topic: 'Benefits of Meditation',
    primaryKeyword: 'meditation benefits',
    articleType: 'informational',
    tone: 'professional',
    titleFormat: 'statement',

    h1: 'Science-Backed Benefits of Daily Meditation',
    h2s: [
      'Mental Health Improvements',
      'Physical Health Benefits',
      'Stress Reduction Effects',
      'Cognitive Enhancement',
      'Better Sleep Quality',
    ],
    closingH2: 'Starting Your Meditation Journey',
    faqH2: 'Meditation Questions',
    faqQuestions: [
      'How long should I meditate each day?',
      'What is the best time to meditate?',
      'Can meditation help with anxiety?',
    ],
    meta: {
      title: 'Benefits of Meditation: Science-Backed Guide 2024',
      description: 'Discover the proven benefits of meditation for mind and body. Learn how daily practice improves mental health, reduces stress, and enhances focus.',
    },
    imageAlts: {
      featured: 'Person meditating peacefully in serene natural setting with morning sunlight filtering through trees',
      h2s: [
        'Brain scan imagery showing increased activity in prefrontal cortex during meditation practice',
        'Heart rate monitor displaying calm steady rhythm during mindfulness meditation session',
        'Office worker taking mindful breathing break at desk with eyes closed hands relaxed',
        'Student demonstrating improved focus while studying after completing meditation session',
        'Peaceful bedroom environment with meditation cushion suggesting healthy sleep routine',
      ],
    },

    overviewText: 'Meditation has moved from ancient practice to modern science. Research now confirms what practitioners have known for centuries: regular meditation transforms both mind and body in measurable ways.\n\nFrom reducing anxiety to improving focus, the benefits of daily meditation extend across nearly every aspect of health. Even brief sessions produce meaningful results.',
    sectionTexts: [
      'Studies show meditation significantly reduces symptoms of anxiety and depression. Regular practitioners report greater emotional stability and resilience during challenging situations.\n\nThe practice helps regulate the amygdala, our brain\'s stress response center. This results in calmer reactions to daily stressors and improved mood regulation over time.\n\nMindfulness meditation particularly excels at breaking negative thought patterns. Practitioners learn to observe thoughts without judgment, reducing their emotional impact.',
    ],
    closingText: 'The meditation benefits are clear and well-documented by science. Start with just five minutes daily and gradually increase as the practice becomes natural.',
    faqAnswers: [
      'Begin with five to ten minutes daily and gradually increase. Research shows benefits accumulate with consistent practice rather than session length alone.',
      'Morning meditation sets a calm tone for the day ahead. However, any consistent time works—the key is making it a daily habit.',
      'Yes, numerous studies confirm meditation reduces anxiety symptoms significantly. Mindfulness-based practices show particular effectiveness for generalized anxiety disorder.',
    ],

    componentData: {
      quickFacts: [
        { label: 'Stress reduction', value: 'Up to 40% decrease in cortisol' },
        { label: 'Focus improvement', value: 'Measurable after 8 weeks' },
        { label: 'Sleep quality', value: 'Better in 60% of practitioners' },
        { label: 'Blood pressure', value: 'Average 5-point reduction' },
        { label: 'Anxiety relief', value: 'Comparable to medication' },
      ],
    },
  },

  comparison: {
    topic: 'iPhone vs Android',
    primaryKeyword: 'iPhone vs Android',
    articleType: 'comparison',
    tone: 'professional',
    titleFormat: 'statement',

    h1: 'iPhone vs Android: Complete Comparison Guide',
    h2s: [
      'Operating System Experience',
      'Hardware and Performance',
      'App Ecosystem Differences',
      'Privacy and Security',
      'Value and Price Comparison',
    ],
    closingH2: 'Making Your Choice',
    faqH2: 'Common Questions',
    faqQuestions: [
      'Which phone has better cameras?',
      'Is switching from Android to iPhone hard?',
      'Which ecosystem has better apps?',
    ],
    meta: {
      title: 'iPhone vs Android 2024: Detailed Comparison Guide',
      description: 'Compare iPhone and Android phones across performance, features, and value. Our comprehensive guide helps you choose the right smartphone.',
    },
    imageAlts: {
      featured: 'Latest iPhone and Samsung Galaxy flagship smartphones displayed side by side on clean white surface',
      h2s: [
        'Split screen showing iOS home screen interface compared to Android home screen customization options',
        'Benchmark performance graphs comparing iPhone A17 chip versus Snapdragon 8 Gen 3 processor',
        'App Store and Google Play Store icons with download statistics displayed on smartphones',
        'Privacy settings screens showing security options available on both iPhone and Android devices',
        'Price comparison chart showing various iPhone and Android models at different price points',
      ],
    },

    overviewText: 'Choosing between iPhone and Android remains one of the biggest decisions for smartphone buyers. Both platforms have evolved significantly, each offering distinct advantages for different users.\n\nThis comprehensive comparison examines every major factor to help you make an informed decision. We cut through marketing hype to deliver honest assessments.',
    sectionTexts: [
      'iOS offers a polished, consistent experience across all Apple devices. The interface prioritizes simplicity and works seamlessly with other Apple products like Mac and iPad.\n\nAndroid provides greater customization and flexibility in how you organize and interact with your phone. Users can change launchers, widgets, and default apps freely.\n\nBoth systems have matured significantly—the gap in reliability and features has narrowed considerably over recent years.',
    ],
    closingText: 'The iPhone vs Android choice depends on your priorities and ecosystem preferences. Both offer excellent experiences, so choose based on what matters most to you.',
    faqAnswers: [
      'Both platforms offer excellent cameras with different processing styles. iPhone excels at video while top Android phones often lead in computational photography.',
      'Apple provides Move to iOS app making transfer straightforward. Most data moves easily though some app purchases may need repurchasing.',
      'Major apps exist on both platforms with minimal differences. Apple often receives updates first while Android has more flexibility.',
    ],

    componentData: {
      itemA: 'iPhone',
      itemB: 'Android',
      criteria: [
        { name: 'Ease of Use', valueA: 'Intuitive, consistent', valueB: 'Learning curve, more options' },
        { name: 'Customization', valueA: 'Limited', valueB: 'Extensive' },
        { name: 'App Quality', valueA: 'Generally higher', valueB: 'More variety' },
        { name: 'Hardware Options', valueA: 'iPhone only', valueB: 'Many manufacturers' },
        { name: 'Price Range', valueA: '$429-$1,599', valueB: '$100-$1,799' },
      ],
    },
  },

  listicle: {
    topic: 'Best Productivity Apps',
    primaryKeyword: 'productivity apps',
    articleType: 'listicle',
    tone: 'professional',
    titleFormat: 'listicle',

    h1: '7 Best Productivity Apps to Transform Your Workflow',
    h2s: [
      '1. Notion - Best All-in-One Workspace',
      '2. Todoist - Best Task Management',
      '3. Slack - Best Team Communication',
      '4. Calendly - Best Scheduling Tool',
      '5. Evernote - Best Note Taking',
      '6. Trello - Best Project Boards',
      '7. Focus@Will - Best Focus Music',
    ],
    closingH2: 'Boost Your Productivity Today',
    faqH2: 'App Questions',
    faqQuestions: [
      'Are free productivity apps worth using?',
      'Can I use multiple productivity apps together?',
      'Which app is best for small teams?',
    ],
    meta: {
      title: '7 Best Productivity Apps 2024: Transform Your Workflow',
      description: 'Discover the top productivity apps to boost your efficiency. From task management to focus tools, find the perfect apps for your workflow.',
    },
    imageAlts: {
      featured: 'Smartphone and laptop displaying various productivity app interfaces arranged on organized modern desk setup',
      h2s: [
        'Notion app interface showing connected workspace with databases notes and project pages visible',
        'Todoist task list view with priorities labels and due dates organized in clean interface',
        'Slack workspace with multiple channels and direct message conversations on desktop screen',
        'Calendly scheduling page showing available time slots and meeting booking options',
        'Evernote notebook interface with tagged notes documents and web clippings organized',
        'Trello board view with colorful cards moving through workflow columns left to right',
        'Focus@Will app playing concentration music with productivity timer visible on phone',
      ],
    },

    overviewText: 'The right productivity apps can transform how you work and help you accomplish more in less time. With thousands of options available, finding the best tools requires careful evaluation.\n\nWe tested dozens of productivity apps to identify the seven that deliver the most value. Each selection excels in its category and integrates well with other tools.',
    sectionTexts: [
      'Notion combines notes, databases, wikis, and project management in one flexible platform. The block-based interface allows you to build custom workflows tailored to your exact needs.\n\nTeams love Notion for its collaborative features and ability to create shared knowledge bases. The template gallery provides quick starting points for common use cases.\n\nWhile the learning curve exists, the payoff is a truly personalized workspace that grows with your needs over time.',
    ],
    closingText: 'These productivity apps represent the best tools available for getting more done. Start with one or two that address your biggest pain points and expand from there.',
    faqAnswers: [
      'Yes, many free productivity apps offer substantial functionality. Premium tiers typically add team features and advanced integrations rather than core capabilities.',
      'Absolutely, most productivity apps integrate with each other seamlessly. Tools like Zapier can connect apps that lack native integrations.',
      'Slack combined with Notion or Trello works excellently for small teams. The combination covers communication project management and documentation needs.',
    ],

    componentData: {
      mainListItems: [
        'Notion',
        'Todoist',
        'Slack',
        'Calendly',
        'Evernote',
        'Trello',
        'Focus@Will',
      ],
    },
  },

  commercial: {
    topic: 'Project Management Software',
    primaryKeyword: 'project management software',
    articleType: 'commercial',
    tone: 'persuasive',
    titleFormat: 'statement',

    h1: 'Streamline Your Team with Modern Project Management',
    h2s: [
      'Key Features You Need',
      'Benefits for Your Team',
      'How It Works',
      'Pricing Plans',
      'Getting Started Guide',
    ],
    closingH2: 'Transform Your Workflow Today',
    faqH2: 'Questions',
    faqQuestions: [
      'How long does implementation take?',
      'Can it integrate with existing tools?',
      'Is there a free trial available?',
    ],
    meta: {
      title: 'Project Management Software: Boost Team Productivity',
      description: 'Discover how project management software can transform your team\'s productivity. Explore features, benefits, and pricing. Start your free trial.',
    },
    imageAlts: {
      featured: 'Team collaborating on project management software with colorful dashboard visible on large monitor screen',
      h2s: [
        'Project management dashboard showing task boards timelines and team workload distribution features',
        'Happy team members celebrating project milestone completion around computer displaying progress charts',
        'Step by step workflow diagram showing how tasks move through project management system stages',
        'Pricing comparison table with three tier options showing features included at each level',
        'New user onboarding screen with setup wizard guiding through initial configuration steps',
      ],
    },

    overviewText: 'Managing projects across teams shouldn\'t feel like herding cats. Modern project management software brings clarity, accountability, and efficiency to even the most complex workflows.\n\nDiscover how the right tools can transform your team\'s productivity and help you deliver projects on time and under budget consistently.',
    sectionTexts: [
      'Effective project management software includes intuitive task management with dependencies and deadlines. Visual timelines help teams understand project scope at a glance.\n\nReal-time collaboration features eliminate endless email chains and status meetings. Everyone sees current progress and knows exactly what needs attention.\n\nCustomizable workflows adapt to how your team actually works rather than forcing rigid processes. Build boards and views that match your methodology.',
    ],
    closingText: 'Stop struggling with spreadsheets and scattered communications. Modern project management software gives your team the visibility and tools needed to excel consistently.',
    faqAnswers: [
      'Most teams are fully operational within one to two weeks. Our onboarding specialists guide you through setup and migration from existing tools.',
      'Yes, we integrate with over two hundred popular business tools. Native connections include Slack, Google Workspace, Microsoft 365, and more.',
      'Absolutely, we offer a fourteen day free trial with full feature access. No credit card required to start exploring.',
    ],

    componentData: {
      productName: 'ProjectFlow Pro',
      features: [
        { title: 'Smart Task Management', description: 'Organize work with customizable boards, lists, and timelines that adapt to your workflow.' },
        { title: 'Team Collaboration', description: 'Keep everyone aligned with real-time updates, comments, and file sharing.' },
        { title: 'Resource Planning', description: 'Balance workloads and prevent burnout with visual capacity planning tools.' },
        { title: 'Reporting Dashboard', description: 'Track progress with automated reports and customizable analytics.' },
        { title: 'Integrations', description: 'Connect your favorite tools for seamless workflow automation.' },
      ],
      ctaText: 'Start Free Trial',
    },
  },

  local: {
    topic: 'Plumbing Services',
    primaryKeyword: 'plumber near me',
    articleType: 'local',
    tone: 'professional',
    titleFormat: 'statement',

    h1: 'Expert Plumbing Services in Austin',
    h2s: [
      'Our Plumbing Services',
      'Why Choose Local Plumbers',
      'Service Areas We Cover',
      'Customer Testimonials',
      'Emergency Plumbing Help',
    ],
    closingH2: 'Get Expert Help Today',
    faqH2: 'Service Questions',
    faqQuestions: [
      'Do you offer same-day service?',
      'What are your service hours?',
      'Do you provide free estimates?',
    ],
    meta: {
      title: 'Austin Plumber | 24/7 Emergency Plumbing Services',
      description: 'Need a reliable plumber in Austin? Our licensed plumbers provide fast, affordable service. Available 24/7 for emergencies. Call for free estimate.',
    },
    imageAlts: {
      featured: 'Licensed Austin plumber in uniform working on residential pipe repair with professional tools',
      h2s: [
        'Professional plumber fixing kitchen sink faucet with wrench in modern Austin home',
        'Local plumbing service van parked outside Austin residential neighborhood ready for service',
        'Map of Austin metropolitan area showing plumbing service coverage zones highlighted',
        'Happy homeowner shaking hands with plumber after successful water heater installation',
        'Emergency plumber responding to flooded bathroom with professional water extraction equipment',
      ],
    },

    overviewText: 'When plumbing problems strike in Austin, you need a local plumber you can trust. Our licensed team provides fast, reliable service for homes and businesses throughout the Austin area.\n\nFrom routine maintenance to emergency repairs, we handle all plumbing needs with professionalism and fair pricing. Austin residents have trusted us for over fifteen years.',
    sectionTexts: [
      'We provide comprehensive plumbing services for residential and commercial properties. Our team handles everything from simple drain cleaning to complete pipe replacement projects.\n\nPopular services include water heater installation, leak detection, bathroom remodels, and sewer line repair. Every job receives the same attention to quality regardless of size.\n\nOur plumbers arrive in fully stocked trucks, ready to complete most repairs in a single visit without delays for parts.',
    ],
    closingText: 'Don\'t let plumbing problems disrupt your day. Contact Austin\'s trusted local plumbers for fast, reliable service at competitive prices.',
    faqAnswers: [
      'Yes, we offer same-day service for most plumbing issues. Emergency calls receive priority response typically within one hour.',
      'We operate seven days a week from seven AM to nine PM. Our emergency line is available twenty-four hours for urgent situations.',
      'Absolutely, we provide free estimates for all standard plumbing services. Emergency diagnostic fees may apply for after-hours calls.',
    ],

    componentData: {
      locationName: 'Austin',
      serviceAreas: ['Downtown Austin', 'North Austin', 'South Austin', 'East Austin', 'West Austin', 'Round Rock', 'Cedar Park'],
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get mock data for a specific article type
 */
export function getMockData(articleType: string): MockDataSet | undefined {
  return MOCK_DATA[articleType]
}

/**
 * Get all available article types with mock data
 */
export function getAvailableMockTypes(): string[] {
  return Object.keys(MOCK_DATA)
}

/**
 * Get mock data with overrides for specific fields
 */
export function getMockDataWithOverrides(
  articleType: string,
  overrides: Partial<MockDataSet>
): MockDataSet | undefined {
  const base = MOCK_DATA[articleType]
  if (!base) return undefined

  return {
    ...base,
    ...overrides,
    meta: { ...base.meta, ...overrides.meta },
    imageAlts: { ...base.imageAlts, ...overrides.imageAlts },
    componentData: { ...base.componentData, ...overrides.componentData },
  }
}

/**
 * Extract params for a prompt from mock data
 * Comprehensive mapping for ALL prompt types
 */
export function extractParamsFromMockData(
  mockData: MockDataSet,
  promptId: string
): Record<string, unknown> {
  // Base params that apply to ALL prompts
  const params: Record<string, unknown> = {
    topic: mockData.topic,
    primaryKeyword: mockData.primaryKeyword,
    articleType: mockData.articleType,
    tone: mockData.tone || 'professional',
    titleFormat: mockData.titleFormat || 'statement',
  }

  const cd = (mockData.componentData || {}) as Record<string, unknown>

  // ═══════════════════════════════════════════════════════════════════════════════
  // STRUCTURE PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  if (promptId.startsWith('structure.')) {
    // H1 prompts - basic params sufficient
    if (promptId === 'structure.h1' || promptId === 'structure.h1-only') {
      params.h2Count = mockData.h2s.length
    }

    // H2 prompts - need h1
    if (promptId === 'structure.h2') {
      params.h1 = mockData.h1
      params.h2Count = mockData.h2s.length
    }

    // H2-from-H1 special case
    if (promptId === 'structure.h2-from-h1') {
      params.normalizedH1 = mockData.h1
      params.h1Promise = Promise.resolve(mockData.h1)
      params.variation = 'none'
      params.h2Count = mockData.h2s.length
    }

    // FAQ
    if (promptId === 'structure.faq') {
      params.faqCount = mockData.faqQuestions.length
    }

    // Closing H2
    if (promptId === 'structure.closing-h2') {
      params.h1 = mockData.h1
    }

    // Meta
    if (promptId === 'structure.meta') {
      params.h1 = mockData.h1
    }

    // Image Alt
    if (promptId === 'structure.image-alt') {
      params.h1 = mockData.h1
      params.h2s = mockData.h2s
    }

    // Full Structure
    if (promptId === 'structure.full') {
      params.h2Count = mockData.h2s.length
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTENT PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  if (promptId.startsWith('content.')) {
    // Overview
    if (promptId === 'content.overview') {
      params.h1 = mockData.h1
    }

    // Section
    if (promptId === 'content.section') {
      params.h1 = mockData.h1
      params.h2 = mockData.h2s[0]
      params.h2Index = 0
      params.totalH2s = mockData.h2s.length
    }

    // Closing
    if (promptId === 'content.closing') {
      params.h1 = mockData.h1
      params.closingH2 = mockData.closingH2
    }

    // FAQ Answers
    if (promptId === 'content.faq-answers') {
      params.questions = mockData.faqQuestions
    }

    // Key Takeaways
    if (promptId === 'content.key-takeaways') {
      params.h1 = mockData.h1
      params.mainH2s = mockData.h2s
    }

    // Topic Overview (comparison)
    if (promptId === 'content.topic-overview') {
      params.topicName = (cd.itemA as string) || mockData.h2s[0] || mockData.topic
      params.h2 = mockData.h2s[0]
      params.position = 'first'
    }

    // Quick Verdict (comparison)
    if (promptId === 'content.quick-verdict') {
      params.optionA = (cd.itemA as string) || 'Option A'
      params.optionB = (cd.itemB as string) || 'Option B'
    }

    // Tips Paragraph (recipe)
    if (promptId === 'content.tips-paragraph') {
      params.recipeTopic = mockData.topic
      params.h2 = mockData.h2s[mockData.h2s.length - 2] || 'Pro Tips'
    }

    // Rating Paragraph (review)
    if (promptId === 'content.rating-paragraph') {
      const rating = cd.rating as { score?: number } | undefined
      params.score = rating?.score || 8.5
      params.productName = (cd.productName as string) || mockData.topic
    }

    // Stream Content
    if (promptId === 'content.stream') {
      params.contentType = 'section'
      params.targetWords = 300
      params.context = mockData.h1
      params.h2 = mockData.h2s[0]
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPONENT PROMPTS (Article-Type Aware)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (promptId.startsWith('component.')) {
    // Product Card (affiliate)
    if (promptId === 'component.product-card') {
      const products = (cd.products as Array<{ name: string; price: string; badge: string }>) || []
      params.productIndex = 0
      params.totalProducts = products.length || 3
      if (products[0]) {
        params.productName = products[0].name
        params.badge = products[0].badge || 'Top Pick'
        params.priceRange = products[0].price || '$50-$200'
      } else {
        params.productName = mockData.topic
        params.badge = 'Top Pick'
        params.priceRange = '$50-$200'
      }
    }

    // Feature List (affiliate/commercial)
    if (promptId === 'component.feature-list') {
      params.productOrService = mockData.topic
      params.features = (cd.features as string[]) || ['Feature 1', 'Feature 2', 'Feature 3']
    }

    // CTA Box
    if (promptId === 'component.cta-box') {
      params.offerType = 'discount'
      params.ctaText = (cd.ctaText as string) || 'Check Price'
    }

    // Comparison Table (comparison)
    if (promptId === 'component.comparison-table') {
      params.itemA = (cd.itemA as string) || 'Item A'
      params.itemB = (cd.itemB as string) || 'Item B'
    }

    // Pros/Cons (review)
    if (promptId === 'component.pros-cons') {
      params.productName = (cd.productName as string) || mockData.topic
      params.pros = (cd.pros as string[]) || ['Great quality', 'Excellent value']
      params.cons = (cd.cons as string[]) || ['Could be better', 'Room for improvement']
    }

    // Rating (review)
    if (promptId === 'component.rating') {
      const rating = cd.rating as { score?: number } | undefined
      params.productName = (cd.productName as string) || mockData.topic
      params.score = rating?.score || 8.5
      params.prosConsContext = 'Pros: Great quality, excellent performance. Cons: Premium price point.'
    }

    // Ingredients (recipe)
    if (promptId === 'component.ingredients') {
      params.recipeTopic = mockData.topic
      params.servings = (cd.servings as number) || 4
      params.ingredients = (cd.ingredients as string[]) || ['Ingredient 1', 'Ingredient 2']
    }

    // Instructions (recipe)
    if (promptId === 'component.instructions') {
      params.recipeTopic = mockData.topic
      params.ingredients = (cd.ingredients as string[]) || ['Ingredient 1', 'Ingredient 2']
    }

    // Nutrition (recipe)
    if (promptId === 'component.nutrition') {
      params.recipeTopic = mockData.topic
      params.servings = (cd.servings as number) || 4
      params.recipeType = 'dessert'
    }

    // Materials (how-to)
    if (promptId === 'component.materials') {
      params.items = (cd.materials as string[]) || ['Material 1', 'Material 2']
    }

    // Pro Tips (how-to)
    if (promptId === 'component.pro-tips') {
      params.stepsContext = 'Step 1: Prepare materials. Step 2: Begin the process. Step 3: Complete the task.'
    }

    // Quick Facts (informational)
    if (promptId === 'component.quick-facts') {
      params.facts = (cd.quickFacts as string[]) || ['Fact 1', 'Fact 2', 'Fact 3']
    }

    // Why Choose Local (local)
    if (promptId === 'component.why-choose-local') {
      params.locationName = (cd.locationName as string) || 'Austin'
    }

    // Honorable Mentions (listicle)
    if (promptId === 'component.honorable-mentions') {
      const apps = cd.apps as Array<{ name: string }> | undefined
      params.mainListItems = apps?.slice(0, 3).map(a => a.name) || ['Item 1', 'Item 2', 'Item 3']
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // KEYWORD PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════════
  if (promptId.startsWith('keyword.')) {
    // Use primaryKeyword as seedKeyword for all keyword prompts
    params.seedKeyword = mockData.primaryKeyword
    params.language = 'en-US'

    // Local keywords need location
    if (promptId === 'keyword.local') {
      params.location = (cd.locationName as string) || 'Austin, TX'
    }
  }

  return params
}
