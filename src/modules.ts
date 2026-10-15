import type { ModuleDefinition } from './types'

export const modules: ModuleDefinition[] = [
  {
    id: 'study',
    label: '学途助力',
    shortLabel: '学途',
    title: '学途助力 · 把大任务拆成现在就能做的一小步',
    description: '作业太多、不知道从哪开始？我陪你把任务拆小，先做最容易动手的那一步。',
    accent: '#3f8fd2',
    features: [
      '拆分任务',
      '陪你专注一小段时间',
      '一起整理错题',
      '记下走神和拖延',
      '列出这次的小困难',
    ],
    exampleInput: '帮我把今天的作业拆成小步骤，先做哪个？',
    starters: [
      '帮我把今天的作业拆成小步骤，先做哪个？',
      '我学不进去、不想学，怎么办？',
      '带我把这道错题理一理',
    ],
    tools: [
      {
        title: '5分钟启动',
        description: '先只定接下来五分钟做什么。',
        prompt: '请给我一个5分钟就能开始的小任务，我做完再继续。',
      },
      {
        title: '安排一小段学习',
        description: '安排一个短时、能做完的学习段。',
        prompt: '请根据我今天的任务，安排一个20分钟的学习计划。',
      },
      {
        title: '这次的小困难',
        description: '只整理这次遇到的问题，不翻旧账。',
        prompt: '请帮我整理这次学习中遇到的困难，只针对这一次。',
      },
      {
        title: '记下这次走神',
        description: '记一下这次走神或拖延，只记这一次。',
        prompt: '我想记录一次走神或拖延：发生了什么、大概多久，只记这一次。',
      },
      {
        title: '错题整理',
        description: '从几个角度看看这道题为啥错。',
        prompt: '我想把一道错题理一理：是哪里不会、下次怎么避免。',
      },
    ],
  },
  {
    id: 'thought',
    label: '转念梳理',
    shortLabel: '转念',
    title: '转念梳理 · 把想法理一理，看看另一种可能',
    description: '有时让我们难受的不是事情本身，而是对它的想法。我陪你把事实和感受分开，找找别的解释。',
    accent: '#3f8fd2',
    features: [
      '把事实和感受分开',
      '找找支持和反对的理由',
      '想想别的可能',
      '提醒你想得太绝对时',
    ],
    exampleInput: '我总觉得一次没考好就说明我很差，能帮我理理吗？',
    starters: [
      '我总觉得一次没考好就说明我很差，能帮我理理吗？',
      '帮我把这件事的想法理一理',
      '我是不是想得太绝对了？',
    ],
    tools: [
      {
        title: '说说发生了什么',
        description: '先看清发生的事、当时的想法和感受。',
        prompt: '我想把一件事说清楚：发生了什么、我当时怎么想、现在什么感受。',
      },
      {
        title: '找找支持和反对的理由',
        description: '看看哪些事实支持、哪些不支持这个想法。',
        prompt: '帮我找找支持和反对这个想法的事实。',
      },
      {
        title: '想想别的可能',
        description: '除了现在的想法，还有没有别的解释？',
        prompt: '帮我想想这件事还有没有别的可能和解释。',
      },
      {
        title: '提醒我想得太绝对时',
        description: '当我用"总是/全都/没救了"这类词时，轻轻提醒我。',
        prompt: '如果我说话太绝对（比如总是、全都、没救了），请提醒我，由我自己确认。',
      },
    ],
  },
  {
    id: 'emotion',
    label: '心叙倾诉',
    shortLabel: '心叙',
    title: '心叙倾诉 · 先照顾此刻的心情，再决定下一步',
    description: '烦躁、紧张、压力大？我陪你把心情说出来，慢慢放松，再继续。',
    accent: '#3f8fd2',
    features: [
      '给心情起个名字',
      '几个马上能做的放松小练习',
      '可以先停一停',
      '慢慢回到任务',
    ],
    exampleInput: '我今天有点烦，想聊聊。',
    starters: [
      '我今天有点烦，想聊聊。',
      '带我做一个3分钟的放松练习。',
      '我想先停一停，等稳下来再继续。',
    ],
    tools: [
      {
        title: '情绪打卡',
        description: '三个小步骤记下此刻的心情，7天后自动删除。',
        prompt: '我想做一次情绪打卡：陪我确认心情和强度（1-5 我自己说），我同意后再保存。',
        action: 'mood-checkin',
      },
      {
        title: '深呼吸放松',
        description: '用一段简单节奏帮身体慢下来。',
        prompt: '带我做一个简短、不憋气的深呼吸练习。',
      },
      {
        title: '回到此刻的小练习',
        description: '把注意力带回现在能看到、摸到的东西。',
        prompt: '带我做一次"回到此刻"的小练习。',
      },
      {
        title: '给心情起个名字',
        description: '说说最近的感受，一起给它起个名字。',
        prompt: '陪我辨认现在的心情，强度由我自己说。',
      },
      {
        title: '先停一停再回来',
        description: '先暂停学习，稳一点再回到任务。',
        prompt: '我想先暂停学习，等稳一些再带我回来。',
      },
    ],
  },
  {
    id: 'records',
    label: '我的心隅记录',
    shortLabel: '心隅记录',
    title: '我的心隅记录 · 你的记录，由你掌控',
    description: '这里能看到你保存过的记录（心情、学习任务、想法练习），最多留7天，也能一次删光。',
    accent: '#3f8fd2',
    features: [
      '看最近7天的心情记录',
      '看学习任务和想法练习',
      '随时删光全部记录',
      '只记事实，不给你打分',
    ],
    exampleInput: '看看我最近7天的记录。',
    starters: [
      '看看我最近7天的记录',
      '看看我最近的心情记录',
      '我要删掉全部记录',
    ],
    prefill: '看看我最近7天保存的记录（心情、学习任务、想法练习），按类型帮我汇总。',
    tools: [
      {
        title: '查看情绪记录',
        description: '汇总最近7天的心情打卡，只说事实。',
        prompt: '看看我最近7天的情绪记录，按天汇总，只说事实不打分。',
      },
      {
        title: '查看学业任务',
        description: '看保存的学习任务和完成情况。',
        prompt: '看看我保存的学习任务和完成情况。',
      },
      {
        title: '查看想法练习',
        description: '看最近保存的想法练习。',
        prompt: '看看我最近7天的想法练习记录。',
      },
      {
        title: '删除全部记录',
        description: '删之前先和你确认。',
        prompt: '我要删除我的全部记录。请先和我确认范围，我同意后再删，并告诉我结果。',
      },
    ],
  },
]

export const getModule = (id: ModuleDefinition['id']) =>
  modules.find((item) => item.id === id) ?? modules[0]
