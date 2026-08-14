import type { ModuleDefinition } from './types'

export const modules: ModuleDefinition[] = [
  {
    id: 'chat',
    label: '智能对话',
    shortLabel: '对话',
    title: '今天想从哪里开始？',
    description: '可以从一项学习任务、一次认知练习，或此刻的感受开始。',
    accent: '#3f8fd2',
    starters: [
      '我有个学习任务不想开始，帮我拆成几个小步骤',
      '我今天心情不太好，想先聊一聊',
      '我总觉得自己什么都做不好，带我做一次ABC练习',
    ],
    tools: [
      {
        title: '拆解学习任务',
        description: '把眼前的任务缩小到5至20分钟能完成的一步。',
        prompt: '请帮我把现在最重要的学习任务拆成一个能马上开始的小目标。',
      },
      {
        title: '进行情绪调节',
        description: '先照顾此刻的感受，再决定是否回到学习任务。',
        prompt: '我想先说说刚才发生的事，请陪我稳住情绪。',
      },
      {
        title: '开始认知练习',
        description: '用ABC结构整理事件、想法、感受与其他解释。',
        prompt: '请带我做一次ABC认知练习，一次只问我一个问题。',
      },
    ],
  },
  {
    id: 'study',
    label: '学业支持',
    shortLabel: '学习',
    title: '把任务变得可开始',
    description: '从目标、步骤和时间安排中选一个。',
    accent: '#3f8fd2',
    starters: [
      '帮我拆解今天的作业',
      '带我做一次错题复盘',
      '用费曼法检查我是否真的懂了',
    ],
    tools: [
      {
        title: '5分钟启动',
        description: '只确定接下来五分钟要完成的动作。',
        prompt: '请给我一个5分钟启动任务，我完成后再继续。',
      },
      {
        title: '20分钟学习安排',
        description: '安排一个短时、明确、能结束的学习段。',
        prompt: '请根据我今天的任务，安排一个20分钟学习计划。',
      },
      {
        title: '错题四维复盘',
        description: '从能力、努力、难度和环境四个方面复盘。',
        prompt: '我想按能力、努力、任务难度和环境四个方面复盘一道错题。',
      },
    ],
  },
  {
    id: 'thought',
    label: '认知建构',
    shortLabel: '认知',
    title: '一步一步建构更完整的理解',
    description: '用ABC结构整理事件、想法、情绪、证据与替代解释。',
    accent: '#3f8fd2',
    starters: [
      '我总觉得这次考差就说明我不行',
      '带我做一次ABC认知练习',
      '帮我找找支持和反对这个想法的事实',
    ],
    tools: [
      {
        title: '梳理事件与影响',
        description: '先看清发生的事、当时的想法和带来的感受。',
        prompt: '请用ABC结构帮我梳理这件事，一次只问一个问题。',
      },
      {
        title: '寻找证据与反证据',
        description: '一起查看哪些事实支持或不支持现在的判断。',
        prompt: '请引导我寻找支持和不支持这个判断的事实。',
      },
      {
        title: '寻找替代解释',
        description: '列出更完整、更符合事实的其他解释。',
        prompt: '请引导我寻找与原想法不一致的事实和其他可能解释。',
      },
    ],
  },
  {
    id: 'emotion',
    label: '情绪调节',
    shortLabel: '调节',
    title: '先照顾此刻的自己',
    description: '从情绪命名、基础稳定化和学习任务联动中选择一步。',
    accent: '#3f8fd2',
    starters: [
      '我现在压力有点大',
      '教我一个现在就能做的放松方法',
      '我想先暂停学习，等稳下来再继续',
    ],
    tools: [
      {
        title: '情绪命名',
        description: '结合身体感受和最近发生的事，为情绪找到合适的名字。',
        prompt: '请通过几个简短问题，陪我辨认现在的情绪；强度由我自己评估。',
      },
      {
        title: '短呼吸练习',
        description: '用一段简单节奏帮助身体慢下来。',
        prompt: '请带我做一个简短、不强迫憋气的呼吸练习。',
      },
      {
        title: '感官着陆',
        description: '把注意力带回此刻可以看见和触碰的事物。',
        prompt: '请带我做一次简短的感官着陆练习。',
      },
      {
        title: '暂停并回到任务',
        description: '先暂停学习；等你准备好后，再接着原来的小步骤。',
        prompt: '我想先暂停现在的学习任务，等我稳定一些后再带我回来。',
      },
    ],
  },
  {
    id: 'growth',
    label: '记录管理',
    shortLabel: '记录',
    title: '管理你确认保存的短期记录',
    description: '结构化摘要默认不保存；确认后最多保留7天，也可以主动删除。',
    accent: '#3f8fd2',
    starters: [
      '我想记录一下今天的情绪',
      '查看我近7天仍未过期的记录',
      '删除我的全部记录',
    ],
    tools: [
      {
        title: '确认后保存',
        description: '先展示结构化摘要，只有你明确确认后才保存。',
        prompt: '我想记录今天的情绪，请先整理待保存摘要让我确认。',
      },
      {
        title: '查看近7日记录',
        description: '只查看本人仍在7天保存期内的确认记录。',
        prompt: '请查看我近7天主动确认保存的记录，只描述事实。',
      },
      {
        title: '删除全部记录',
        description: '确认后删除本人的情绪、学习任务与认知练习记录。',
        prompt: '我想删除我的全部记录，请先让我确认再执行。',
      },
    ],
  },
]

export const getModule = (id: ModuleDefinition['id']) =>
  modules.find((item) => item.id === id) ?? modules[0]
