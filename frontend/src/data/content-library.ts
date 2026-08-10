// ── 2025年6月 CET-4 真题阅读内容库 ──
// 三套真题全部阅读理解段落 + 题目 + 答案

export interface PassageQuestion {
  id: number;
  stem: string;
  options: string[];
  answer: number; // 0-indexed option index
}

export interface Passage {
  id: string;
  setNumber: 1 | 2 | 3;
  section: 'A' | 'B' | 'C';
  title: string;
  text: string;
  questions: PassageQuestion[];
}

// ── 第一套 ──

const passage1_1: Passage = {
  id: 'set1-passage1',
  setNumber: 1,
  section: 'C',
  title: 'Pandas and Habitat',
  text: `New research suggests that pandas may be at risk of dying out because they are too comfortable. Experts say too much happiness can stop the bears from searching for new mates.

Environmentalists have long believed that building roads or homes near the bears may threaten their survival by "reducing or fragmenting their natural habitats", The Times reported. But the new research suggests that a "modest degree of discomfort and fragmentation" may actually help preserve panda populations.

The research was conducted by scientists from Michigan State University. It concluded that pandas fail to wander off in search of new mates if they find their habitat too comfortable, resulting in a lack of vital genetic diversity.

For their study—outlined in a paper in the journal Conservation Biology—the team looked at genetic diversity and spread among a Chinese panda population. The ideal level of perfectly livable habitat was found to be only 80% of an area, with the remainder either too harsh or too affected by human activity.

The experts concluded that pandas should ideally "be happy enough to thrive, but not so content that they don't want to move around and find new mates".

Their conclusions about what The Guardian described as this "sweet spot" are in line with the so-called Goldilocks principle: that there can be just the right amount of something. The concept has been applied to a wide range of disciplines, from developmental psychology to economics and engineering.

Claudio Sillero, a professor of conservation biology at Oxford University, told the newspaper that the new findings could have implications beyond panda conservation.

"Most large animals that eat meat live in increasingly fragmented landscapes," said Sillero, who was not involved in the research. "It may well be that the messy nature of their relationship with human efforts induces more animals to scatter or travel further, and might result in greater genetic connectivity and enhanced population persistence."

The most recent count of pandas found that there were more than 1,800 left in the wild, putting them on the list of vulnerable, but not endangered, species.`,
  questions: [
    {
      id: 46,
      stem: 'What do we learn from new research about pandas?',
      options: [
        'They are losing habitat due to the building of roads and houses.',
        'They have stopped seeking new mates for reproduction.',
        'They may not adapt to the fragmentation of their habitat.',
        'They may cease to exist as a result of enjoying too good a life.',
      ],
      answer: 3, // D
    },
    {
      id: 47,
      stem: 'What can we conclude from the new research by scientists at Michigan State University?',
      options: [
        "Environmentalists' long-time belief regarding panda conservation may be misleading.",
        "Housing development near pandas' homes may threaten their survival.",
        "Pandas' natural habitats are becoming less suitable for reproduction.",
        'The increased panda population is attributed to the fragmentation of their habitat.',
      ],
      answer: 0, // A
    },
    {
      id: 48,
      stem: "What is the experts' conclusion regarding pandas?",
      options: [
        'It is urgent to provide an ideal habitat for them to thrive.',
        'It is very important to preserve their genetic diversity.',
        'Their chances of finding new mates have a lot to do with their habitat.',
        'Their environment for survival has been continuously worsening.',
      ],
      answer: 2, // C
    },
    {
      id: 49,
      stem: 'What can we infer from the passage about the Goldilocks principle?',
      options: [
        'It needs to be confirmed by more studies on pandas.',
        'It applies to the preservation of pandas too.',
        'It has implications for future panda research.',
        'It can be used to locate the right spot for pandas.',
      ],
      answer: 1, // B
    },
    {
      id: 50,
      stem: 'What can the new findings do according to Professor Sillero?',
      options: [
        'Help discover new ways for the conservation of pandas.',
        'Help remove pandas from the list of endangered species.',
        'Shed light on the conservation of most large meat-eating animals.',
        'Show the complexity of interactions between humans and animals.',
      ],
      answer: 2, // C
    },
  ],
};

const passage1_2: Passage = {
  id: 'set1-passage2',
  setNumber: 1,
  section: 'C',
  title: 'Grit by Angela Duckworth',
  text: `With those born with natural talents, it feels as if they excel without really trying. But what about those of us who don't have a natural talent? We've been told all our lives that if you work hard, you too can succeed. But with the release of Angela Duckworth's Grit, we are given a new key to success.

"As much as talent counts, effort counts twice," says Duckworth in Grit. She introduces a new concept that talent may be overrated, and if you want real success, what you need is grit, the perfect combination of passion and persistence. Even if you have natural talent, it's nothing without grit.

Duckworth says grit is the difference between success and failure. A person who has grit is more likely to succeed than a person who does not. When we think about attaining success—whether it's landing that job or learning that new skill—our thoughts are immediately burdened by all the things we must first learn. If you want that new job, you have to learn the job skills, then the interview skills, then the dress part—and you must be perfect at all of them. Grit is different because it tells us that perfection isn't the goal.

Grit lifts the unreasonable expectations off our shoulders. Grit tells us that the door is open wider than we first thought possible. Grit allows us to redefine our goals. Think about it: what's something you've always wanted to do, but gave up because you "don't have the skills for it"? What's something you love but aren't good at?

The real workings of grit are to have sustainable passion and continue to try. Effort means more than your natural ability. Even if you haven't mastered a skill, grit tells you that you can still succeed if you can transform your passion into action. In a way, Duckworth is giving new hope to people who have shut the doors on their dreams. She is saying it is possible that you can accomplish anything. If at first you fail, then try one more time with grit.`,
  questions: [
    {
      id: 51,
      stem: 'What does the passage say about people born with natural talents?',
      options: [
        'They seem to outdo others without hard work.',
        'They appear to know all the secrets to success.',
        'They feel it only too logical to succeed.',
        'They are bound to excel effortlessly.',
      ],
      answer: 0, // A
    },
    {
      id: 52,
      stem: 'What does Duckworth say about talent?',
      options: [
        'It is a new concept much too overrated.',
        'It proves necessary for big achievements.',
        "It plays a lesser role in one's success.",
        'It is a guarantee for real success in life.',
      ],
      answer: 2, // C
    },
    {
      id: 53,
      stem: 'What does the passage say about people thinking of attaining success?',
      options: [
        'They are puzzled how to present their best to the employer.',
        'They are burdened by their expectation of perfection.',
        'They will try hard to land a job that fits their skills best.',
        'They will find themselves lacking in all the skills they need.',
      ],
      answer: 1, // B
    },
    {
      id: 54,
      stem: 'How does the author think grit can be helpful to us?',
      options: [
        'It allows us to know what we are good at.',
        'It opens our eyes to new opportunities.',
        'It focuses our attention on what we do.',
        'It lets us reconsider the goals to achieve.',
      ],
      answer: 3, // D
    },
    {
      id: 55,
      stem: 'What message does Duckworth try to convey in her book Grit?',
      options: [
        'We should perfect ourselves to ensure success.',
        'We should stay persistent even in face of failures.',
        'We can never master a skill without constant practice.',
        'We can never expect to reach our goals without passion.',
      ],
      answer: 1, // B
    },
  ],
};

// ── 第二套 ──

const passage2_1: Passage = {
  id: 'set2-passage1',
  setNumber: 2,
  section: 'C',
  title: 'Dress for Success',
  text: `We all take a little extra effort to look nice for special occasions. But most of us have conflicting feelings about dressing up and feel guilty about taking the time to focus on clothes. Science now suggests the right dress may give ourselves the extra edge in our professional and personal lives.

We hear sayings like "dress for the job you want, not the job you have". Most people don't really believe in them, but research into the impact of clothes on behavior now suggests that there may actually be a grain of truth in these sayings. Science says that the clothes we wear affect our behavior, our mood and even the way we interact with others because of the symbolic meaning that we assign to different types of clothing.

We consider some clothes to be powerful, some to be fun, and so on. We even evaluate people whom we have just met based on their clothes. We also evaluate ourselves based on what we are wearing because of the way they make us feel. This means that the experience of wearing something affects our attitudes and our choice of behavior.

There's a reason tailored jackets are associated with being 'dressed for success'. It seems that wearing formal office wear puts us in the right frame of mind to conduct business. Wearing power clothing makes us feel more confident and even increases hormones needed for displaying dominance. This in turn helps us become better negotiators and abstract thinkers.

While a good suit works wonders for our performance in the boardroom, wearing formal wear isn't a great idea when we want to socialize. Studies have found that people tend to be less open and less able to relax when they wear formal clothes.

On the other hand, a casual dress helps us become more friendly and creative. These findings support the idea of wearing business casuals on a Friday; since colleagues are most likely to take out time to socialize on the last work day of the week. I mean, who wants to hang out with people in their suits?`,
  questions: [
    {
      id: 46,
      stem: 'What does science suggest the right dress may do?',
      options: [
        'Add to our advantage in work and life.',
        'Enable us to look a lot more attractive.',
        'Help us to enjoy a fuller personal life.',
        'Provide extra energy for what we do.',
      ],
      answer: 0, // A
    },
    {
      id: 47,
      stem: "Why does science say the clothes one wears may affect their interaction with others?",
      options: [
        "Clothes usually represent one's social and economic status.",
        "Clothes largely determine one's likability by people around.",
        'Different types of clothing markedly reflect different personalities.',
        'Different types of clothing convey different messages symbolically.',
      ],
      answer: 3, // D
    },
    {
      id: 48,
      stem: 'How do the clothes we wear sway our evaluation of ourselves?',
      options: [
        'By exerting an effect on our power of judgment.',
        'By impacting how we feel about ourselves.',
        'By affecting what we take as the basis for assessment.',
        'By influencing our interpretation of symbolic messages.',
      ],
      answer: 1, // B
    },
    {
      id: 49,
      stem: "Why does the author say tailored jackets are associated with being 'dressed for success'?",
      options: [
        'They are necessary for formal business dealings.',
        'They may help people concentrate on their business.',
        'They are vital to keeping a dominant position in business transactions.',
        'They may enable people to have the right mentality for doing business.',
      ],
      answer: 3, // D
    },
    {
      id: 50,
      stem: 'What are people advised to do when they want to socialize?',
      options: [
        'Focus on clothing.',
        'Wear a good suit.',
        'Dress casually.',
        'Look unusual.',
      ],
      answer: 2, // C
    },
  ],
};

const passage2_2: Passage = {
  id: 'set2-passage2',
  setNumber: 2,
  section: 'C',
  title: 'Classical Music and Opera',
  text: `With the rise of pop music, jazz, and electronic music, both opera and classical music started to fade away from the public eye. Some people are beginning to wonder whether opera and classical music are still relevant to the modern world of music. Granted, you will not typically see today's teenagers lending their ears to Bach anytime soon, but there are some major indicators that both opera and classical music are now still quite alive.

The most major indicator of classical music's importance in society today is the fact that much of the popular music that is currently being produced uses similar beats, harmonies, and melodies as those that were used in some of classical music's best works. Even so, it can be difficult for those who do not study music theory to see this as an indicator, since it is subtle and just shows the impact symphonic orchestras have had on society's taste in music.

A better example for the relevance of opera and classical music can be seen in the invention of the rock opera. Opera, in its simplest definition, is telling a story using music as its form. The art of telling a story using music has not faded in the least bit. In fact, sometimes actual orchestras are used for major parts of the opera itself. Some of the world's greatest hits have been parts of rock operas.

Fans of classical music can also tell you that there are few types of music that are more expressive. So, it should come as no surprise to anyone that classical music pieces are still used as background music in modern movies. Symphonic orchestra compositions have also been created solely for the purpose of being included in major motion pictures. These are often very well received amongst mainstream music fans.

Classical music and opera are the very foundation of what our modern music is based upon. Considering the huge impact they have had on our current society, it is without doubt that we can expect them to continue to remain important for centuries to come.`,
  questions: [
    {
      id: 51,
      stem: "What does the author think of classical music and opera in today's world?",
      options: [
        'They still make their presence felt.',
        'They have given way to electronic music.',
        'They will not fade away from the public eye.',
        "They are no longer relevant to teenagers' lives.",
      ],
      answer: 0, // A
    },
    {
      id: 52,
      stem: 'What do we learn about much of the popular music currently produced?',
      options: [
        'It can be difficult for many classical music fans to appreciate.',
        'It can be seen as an indicator of refinement on classical music.',
        'It signals the impact classical music works have on social grace.',
        "It employs beats, harmonies and melodies like those of classical music.",
      ],
      answer: 3, // D
    },
    {
      id: 53,
      stem: 'What does the author think is a good example of the relevance of opera?',
      options: [
        "The invention of the rock opera.",
        "The subtlety of symphonic orchestras.",
        "The good reception among mainstream music fans.",
        "The art of telling a story using music as its form.",
      ],
      answer: 0, // A (approximate — actual answer from key is C... let me double check)

      // Answer key says 46-50: A D B D C, 51-55: A D C B A
      // Q53 = C from the answer key: C for question 53
    },
  ],
};

// Fix passage2_2 Q53 answer
passage2_2.questions[2].answer = 2; // C

// need to add Q54 and Q55
passage2_2.questions.push(
  {
    id: 54,
    stem: 'What can we conclude about classical music from the passage?',
    options: [
      'It has a solid foundation for further development.',
      'It shapes the basis on which modern music is built.',
      'It is more expressive than most other types of music.',
      'It continues to be the mainstream music of our society.',
    ],
    answer: 1, // B
  },
  {
    id: 55,
    stem: 'What does the author predict about classical music and opera?',
    options: [
      'They will continue to remain important.',
      'They will be replaced by rock operas.',
      'They will attract more teenage fans.',
      'They will lose relevance in modern movies.',
    ],
    answer: 0, // A
  },
);

// ── 第三套 ──

const passage3_1: Passage = {
  id: 'set3-passage1',
  setNumber: 3,
  section: 'C',
  title: 'Inner Beauty vs Outer Beauty',
  text: `Our society places a high value on physical beauty. Americans spend an average of over $722 each year on their appearance. One in ten Americans has tried to look like a star.

There's nothing wrong with trying to look our best, but excessive focus on physical appearance misses the soulful aspects of what it means to be beautiful. Trying to look like the magazine pictures can take us on a long ride away from what beauty is really about.

Many of us spend far too much time, energy, and money trying to polish an image of what we think will bring attention, love, and connection. In the process, we may fail to attend to ourselves in a way that would move us toward deeper intimacy, fulfillment, and meaning.

It may sound trite, but beauty is only skin deep; it's not what brings love toward us. Just read about the latest Hollywood starlets whose seeming love turns into resentment and bitter court battles.

Outer beauty can be as much of a curse as a blessing. We may develop a habit of being so focused on maintaining a perfect appearance that we never cultivate the inner qualities necessary to sustain and deepen intimacy and connection. As I describe in my book, The Authentic Heart, it is the courage to be authentic that connects us in a deeper way.

While our initial attraction may be based, in part, on physical chemistry, it is the meeting of our inner worlds that creates the lasting intimacy and spiritual connection for which we long. If we redirect our attention toward cultivating inner qualities, we might find a magnetic attraction that moves us from something superficial to something that connects us to our depths.

The path toward cultivating inner beauty is really simple. But what is simple is not always easy. Not everyone will see us and appreciate us as we take the courageous risk to allow ourselves to be seen as we really are. But if they don't, it is their loss, not ours. Eventually we'll find those compatible souls who appreciate us as we are.`,
  questions: [
    {
      id: 46,
      stem: 'What do we learn about American society from the first paragraph?',
      options: [
        'It sees lots of personal income wasted on beauty products.',
        "It considers one's physical appearance very important.",
        'It places a high value on the physical fitness of stars.',
        'It expects every individual to look their very best.',
      ],
      answer: 1, // B
    },
    {
      id: 47,
      stem: 'What happens when people strive to look better?',
      options: [
        'They have to get prepared for resentment and bitter court battles.',
        'They are better able to gain attention, love, and personal connection.',
        'They may neglect to cultivate the inner qualities that matter more.',
        'They feel much of their precious time, energy and resources is wasted.',
      ],
      answer: 2, // C
    },
    {
      id: 48,
      stem: 'What does the author say about outer beauty?',
      options: [
        'It may be inherited or cultivated.',
        'It may lead to bad as well as good habits.',
        'It may create connection or isolation.',
        'It may do as much harm as good.',
      ],
      answer: 3, // D
    },
    {
      id: 49,
      stem: 'What brings about spiritual connection?',
      options: [
        'Meeting of minds.',
        'Attraction at first sight.',
        'Physical chemistry.',
        'Frequent interaction.',
      ],
      answer: 0, // A
    },
    {
      id: 50,
      stem: 'What happens when we take the path toward cultivating inner beauty?',
      options: [
        "We may find a route toward other people's souls.",
        'We may be appreciated more by people around us.',
        'We will meet people who value us for who we are.',
        'We will be discouraged from revealing our true selves.',
      ],
      answer: 2, // C
    },
  ],
};

const passage3_2: Passage = {
  id: 'set3-passage2',
  setNumber: 3,
  section: 'C',
  title: 'Plant-Based Meats',
  text: `Plant-based meats are coming soon to a dinner table near you, but do they deserve a spot on your plate? If you tried a vegetable burger years ago and dismissed it as rubbery and flavorless, it's a good time to give meatless meat another chance. Newer varieties imitate the look, flavor, and texture of meat. Analysts don't expect the meat-free movement to slow anytime soon; a 2021 report predicts the market will skyrocket to $74 billion by 2030—a 957 percent surge.

Plant-based meats are no longer just for vegetarians. Companies such as Impossible Foods and Beyond Meat—the current superstars of the alternative protein sector—are pursuing consumers who enjoy meat but want to reduce their meat consumption for animal rights, health, or environmental reasons. So far, it's a winning strategy: More than nine out of ten consumers who buy Beyond Burger and Impossible Foods products also eat meat.

Many vegetarians don't actually care for food that resembles meat. When reporter Joan Solsman, a longtime vegetarian, tried a dish from Impossible Foods, she felt so sick that she couldn't finish it. "Maybe the best sign that Impossible Foods has cracked the code to realistic fake meat is that I couldn't stand to take another bite," she wrote.

Meatless meats are generally a healthier choice than beef because they are cholesterol-free, plus they're a good source of vitamins, minerals, protein, and fiber. If meatless meat can help you stick to a plant-based diet, that in itself can lead to better health. Not only has red meat been linked to cancer, but studies show that people who ditch meat have lower blood pressure, lower average blood sugar, and lower cholesterol levels.

However, just because it's plant-based doesn't mean it's health food. Most imitation meats are highly processed and contain high amounts of sodium compared to traditional beef.

These new generations of alternate meat get all the attention, but don't forget about whole grains and vegetables. Beans are an especially excellent protein substitute. They're nutritious, inexpensive, and far more sustainable than any of the processed meatless substitutes on the market today.`,
  questions: [
    {
      id: 51,
      stem: 'What can we expect of plant-based meats?',
      options: [
        'An increasing interest in their analyses.',
        'An enormous effort in their promotion.',
        'A huge boost in their consumption.',
        'A noticeable surge in their varieties.',
      ],
      answer: 2, // C
    },
    {
      id: 52,
      stem: 'What do we learn about consumers buying Beyond Burger and Impossible Foods products?',
      options: [
        'They are mostly non-vegetarians.',
        'They are mostly animal-rights advocates.',
        'Most of them refrain from eating meat for health reasons.',
        'Most of them eat meatless meat to protect the environment.',
      ],
      answer: 0, // A
    },
    {
      id: 53,
      stem: "What can we conclude about Impossible Foods' products from Joan Solsman's remark?",
      options: [
        'They more often appeal to meat-eaters.',
        'They very much resemble animal meat.',
        'Some have become its signature dishes.',
        'Most of them are sold as true fake meat.',
      ],
      answer: 1, // B
    },
    {
      id: 54,
      stem: 'Why can the habit of eating a plant-based diet lead to better health?',
      options: [
        'It frees people from any known link to cancer.',
        'It provides all the nutrients for staying healthy.',
        'It helps maintain normal blood pressure and blood sugar.',
        'It reduces various health risks posed by meat consumption.',
      ],
      answer: 3, // D... actually key says: B C D A C, so Q54 = A? No wait...
      // Set 3 Section C answers: 46-50: B C D A C, 51-55: C A B D A
      // Q54 = D from answer key (51 C, 52 A, 53 B, 54 D, 55 A)
    },
  ],
};

// Fix Q54
passage3_2.questions[3].answer = 3; // D

// Q55
passage3_2.questions.push({
  id: 55,
  stem: 'What does the author recommend we eat at the end of the passage?',
  options: [
    'Naturally produced foods.',
    'Processed protein substitutes.',
    'Red meats like traditional beef.',
    'New generations of alternate meat.',
  ],
  answer: 0, // A
});

// ── All passages ──
export const allPassages: Passage[] = [
  passage1_1,
  passage1_2,
  passage2_1,
  passage2_2,
  passage3_1,
  passage3_2,
];

// ── Sentence bank for ReadingBreakdown cards ──
// Complex sentences extracted from the 2025-06 CET-4 reading passages
export const breakdownSentences: { source: string; sentence: string; mainClause: string; relation: string; naturalMeaning: string }[] = [
  // Set 1 Passage 1 — Pandas
  {
    source: '2025.06 CET-4 第一套 Passage 1',
    sentence: 'The research was conducted by scientists from Michigan State University, who concluded that pandas fail to wander off in search of new mates if they find their habitat too comfortable.',
    mainClause: 'The research was conducted by scientists from Michigan State University.',
    relation: 'who → concluded that pandas fail to wander off (reason: if habitat too comfortable)',
    naturalMeaning: '密歇根州立大学的科学家做了这项研究，他们得出结论：如果熊猫觉得栖息地太舒服，就不会出去找新伴侣。',
  },
  {
    source: '2025.06 CET-4 第一套 Passage 1',
    sentence: 'The experts concluded that pandas should ideally be happy enough to thrive, but not so content that they want to move around and find new mates.',
    mainClause: 'The experts concluded that pandas should be happy enough to thrive.',
    relation: 'but not so content → that they don\'t want to move around and find new mates (contrast + result)',
    naturalMeaning: '专家们总结：熊猫最好过得刚好舒服——能茁壮成长，但又不至于舒服到不想出去找新伴侣。',
  },
  // Set 1 Passage 2 — Grit
  {
    source: '2025.06 CET-4 第一套 Passage 2',
    sentence: 'She introduces a new concept that talent may be overrated, and if you want real success, what you need is grit, the perfect combination of passion and persistence.',
    mainClause: 'She introduces a new concept.',
    relation: 'that talent may be overrated → and if you want real success → what you need is grit (explanation + condition + conclusion)',
    naturalMeaning: '她引入了一个新概念：天赋可能被高估了。如果你想要真正的成功，需要的是「grit」——激情和坚持的完美结合。',
  },
  {
    source: '2025.06 CET-4 第一套 Passage 2',
    sentence: 'Even if you haven\'t mastered a skill, grit tells you that you can still succeed if you can transform your passion into action.',
    mainClause: 'Grit tells you that you can still succeed.',
    relation: 'Even if you haven\'t mastered a skill → if you can transform your passion into action (concession + condition)',
    naturalMeaning: '即使你还没掌握一项技能，grit 告诉你：只要能把热情转化为行动，你仍然可以成功。',
  },
  // Set 2 Passage 1 — Dress for Success
  {
    source: '2025.06 CET-4 第二套 Passage 1',
    sentence: 'Science says that the clothes we wear affect our behavior, our mood and even the way we interact with others because of the symbolic meaning that we assign to different types of clothing.',
    mainClause: 'Science says that the clothes we wear affect our behavior, our mood and the way we interact with others.',
    relation: 'because of the symbolic meaning → that we assign to different types of clothing (reason + detail)',
    naturalMeaning: '科学表明：我们穿的衣服会影响我们的行为、情绪，甚至我们跟别人的互动方式，这是因为我们给不同类型的衣服赋予了不同的象征意义。',
  },
  {
    source: '2025.06 CET-4 第二套 Passage 1',
    sentence: 'While a good suit works wonders for our performance in the boardroom, wearing formal wear isn\'t a great idea when we want to socialize.',
    mainClause: 'Wearing formal wear isn\'t a great idea.',
    relation: 'While a good suit works wonders for boardroom performance → when we want to socialize (contrast + timing)',
    naturalMeaning: '虽然西装在会议室里能让你状态爆表，但想社交的时候穿正装可不是个好主意。',
  },
  // Set 3 Passage 1 — Beauty
  {
    source: '2025.06 CET-4 第三套 Passage 1',
    sentence: 'While our initial attraction may be based, in part, on physical chemistry, it is the meeting of our inner worlds that creates the lasting intimacy and spiritual connection for which we long.',
    mainClause: 'It is the meeting of our inner worlds that creates the lasting intimacy and spiritual connection.',
    relation: 'While our initial attraction may be based on physical chemistry → it is the meeting of inner worlds that creates... (contrast + emphasis)',
    naturalMeaning: '一开始的吸引力可能部分来源于生理吸引，但真正让我们产生持久亲密感和心灵连接的，是两个内心世界的相遇。',
  },
  {
    source: '2025.06 CET-4 第三套 Passage 1',
    sentence: 'We may develop a habit of being so focused on maintaining a perfect appearance that we never cultivate the inner qualities necessary to sustain and deepen intimacy and connection.',
    mainClause: 'We may develop a habit of being focused on maintaining a perfect appearance.',
    relation: 'so... that we never cultivate the inner qualities → necessary to sustain and deepen intimacy (result + purpose)',
    naturalMeaning: '我们可能会养成习惯，过于专注于保持完美外表，以至于从未培养那些维持和加深亲密关系所必需的内心品质。',
  },
  // Set 3 Passage 2 — Plant-Based Meats
  {
    source: '2025.06 CET-4 第三套 Passage 2',
    sentence: 'Not only has red meat been linked to cancer, but studies show that people who ditch meat have lower blood pressure, lower average blood sugar, and lower cholesterol levels.',
    mainClause: 'Studies show that people who ditch meat have lower blood pressure, lower blood sugar, and lower cholesterol.',
    relation: 'Not only has red meat been linked to cancer → but studies show... (progressive emphasis)',
    naturalMeaning: '红肉不仅跟癌症有关联，研究还表明不吃肉的人血压更低、血糖更稳、胆固醇也更低。',
  },
  {
    source: '2025.06 CET-4 第三套 Passage 2',
    sentence: 'Beans are an especially excellent protein substitute, as they\'re nutritious, inexpensive, and far more sustainable than any of the processed meatless substitutes on the market today.',
    mainClause: 'Beans are an especially excellent protein substitute.',
    relation: 'as they\'re nutritious, inexpensive, and far more sustainable (reason — three parallel reasons)',
    naturalMeaning: '豆类是特别好的蛋白质替代品，因为它营养丰富、价格便宜，而且比市面上任何加工素肉产品都更可持续。',
  },
];

// ── Sentence bank for Reorder cards ──
export interface ReorderSentence {
  id: string;
  source: string;
  chunks: string[];
}

export const reorderSentences: ReorderSentence[] = [
  {
    id: 'reorder-panda',
    source: '2025.06 CET-4 第一套 — Pandas',
    chunks: [
      'The research was conducted',
      'by scientists from Michigan State University',
      'who concluded that pandas fail to wander off',
      'in search of new mates',
      'if they find their habitat too comfortable.',
    ],
  },
  {
    id: 'reorder-grit',
    source: '2025.06 CET-4 第一套 — Grit',
    chunks: [
      'As much as talent counts,',
      'effort counts twice,',
      'says Duckworth in Grit.',
    ],
  },
  {
    id: 'reorder-dress',
    source: '2025.06 CET-4 第二套 — Dress',
    chunks: [
      'Wearing power clothing',
      'makes us feel more confident',
      'and even increases hormones',
      'needed for displaying dominance.',
    ],
  },
  {
    id: 'reorder-beauty',
    source: '2025.06 CET-4 第三套 — Beauty',
    chunks: [
      'It is the courage',
      'to be authentic',
      'that connects us',
      'in a deeper way.',
    ],
  },
  {
    id: 'reorder-plants',
    source: '2025.06 CET-4 第三套 — Plant-Based Meats',
    chunks: [
      'More than nine out of ten consumers',
      'who buy Beyond Burger',
      'and Impossible Foods products',
      'also eat meat.',
    ],
  },
];
