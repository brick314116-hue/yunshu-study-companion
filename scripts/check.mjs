import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
const topbar = readFileSync(new URL('../src/components/AppTopbar.vue', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/components/SideBar.vue', import.meta.url), 'utf8')
const actionMenu = readFileSync(new URL('../src/components/ActionMenuDialog.vue', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../src/components/ChatWorkspace.vue', import.meta.url), 'utf8')
const context = readFileSync(new URL('../src/components/ContextPanel.vue', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/components/IntroPage.vue', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../src/components/LandingPage.vue', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8')
const authDialog = readFileSync(new URL('../src/components/AuthDialog.vue', import.meta.url), 'utf8')
const registerDialog = readFileSync(new URL('../src/components/RegisterDialog.vue', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../src/user-profile.ts', import.meta.url), 'utf8')
const cloudFunction = readFileSync(new URL('../cloudbase-functions/xinyu-chat/app.js', import.meta.url), 'utf8')
const chatApi = readFileSync(new URL('../src/chat-api.ts', import.meta.url), 'utf8')
const consent = readFileSync(new URL('../src/components/ConsentDialog.vue', import.meta.url), 'utf8')
const modules = readFileSync(new URL('../src/modules.ts', import.meta.url), 'utf8')
const store = readFileSync(new URL('../src/conversation-store.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8')
const workspaceConfig = readFileSync(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8')

assert.equal(existsSync(new URL('../src/mock-chat.js', import.meta.url)), false)
assert.equal(existsSync(new URL('../src/components/AppSidebar.vue', import.meta.url)), false)
assert.doesNotMatch(app, /getMockReply|chunkText/)

// 顶栏/侧栏导航结构：模块工具与历史对话已移到左侧栏
assert.match(topbar, /topbar-hamburger/)
assert.match(topbar, /activeTab === 'chat'/)
assert.match(landing, /认识云小舒/)
assert.match(landing, /intro-button/)
assert.match(workspace, /attach-button|上传附件/)
assert.match(sidebar, /class="app-sidebar"/)
assert.match(sidebar, /想做点什么/)
assert.match(sidebar, /历史对话/)
assert.match(sidebar, /toggleCollapse/)
assert.match(actionMenu, /想做点什么？/)
assert.match(actionMenu, /我的记录/)
assert.match(actionMenu, /@click="onMask"/)
assert.doesNotMatch(workspace, /mobile-home-button|emit\('home'\)/)
assert.match(app, /sidebarCollapsed|app-sidebar-wrap/)
assert.match(workspace, /<ShinyText|<SplitText/)
assert.match(home, /<BorderGlow>|<ScrollStack/)
assert.match(landing, /云舒学伴/)
assert.match(app, /selectConversation|deleteConversation|activeConversationId/)

// 认证：登录/注册链路
assert.match(auth, /signUp|signInWithPassword|getSession\(\)|signOut\(\)/)
assert.match(auth, /getAccessToken|getSession|getLoginState/)
assert.doesNotMatch(auth, /localStorage|NUWAX_API_KEY|subject_id/)
// 验证码登录/注册必须回传 verification 信息（含 is_user / verification_id）
assert.match(auth, /is_user: true/)
assert.match(auth, /verification_id/)
assert.match(registerDialog, /verificationId\.value = await sendSmsCode/)
assert.match(registerDialog, /signUpWithPhone\(/)
// token 前缀不允许进 console
assert.doesNotMatch(auth, /token\.slice\(0, 12\)/)
assert.match(chatApi, /getAccessToken|Authorization: `Bearer \$\{accessToken\}`/)
assert.doesNotMatch(chatApi, /sessionToken|subject_id|agentId/)
assert.match(chatApi, /-1462770697\.ap-shanghai\.app\.tcloudbase\.com\/nuwax\/api\/chat/)
// 本地会话与女娲会话一一映射
assert.match(chatApi, /conversationKey/)
assert.match(app, /serverSynced/)
assert.match(cloudFunction, /conversationKey/)

// 云函数：psych_consent 下发 + db-check 自诊断 + 会话写入日志
assert.match(cloudFunction, /handleProfile[\s\S]*authenticatedUserId/)
assert.match(cloudFunction, /psych_consent/)
assert.match(cloudFunction, /db-check|handleDbCheck/)
assert.match(cloudFunction, /DB-SESSION-SAVE-OK|logDb/)

assert.match(app, /await requestChat|status: 'streaming'|sending\.value/)
assert.match(app, /conversations = ref<Conversation\[]>\(\[\]\)|conversations\.value = \[\]/)
assert.match(workspace, /:disabled="sending \|\| !modelValue\.trim\(\)"|send-spinner/)
// 消息长度与云函数 500 字上限一致，且接近上限时有计数提示
assert.match(workspace, /maxlength="500"/)
assert.match(workspace, /composer-count/)
assert.match(store, /localStorage\.removeItem/)
assert.doesNotMatch(store, /localStorage\.setItem|sessionStorage/)

// 模块清单：工具菜单中的学习、换个想法、聊心情、我的记录
assert.match(modules, /label: '学习'/)
assert.match(modules, /label: '换个想法'/)
assert.match(modules, /label: '聊心情'/)
assert.match(modules, /label: '我的记录'/)
assert.match(modules, /情绪打卡/)
assert.match(modules, /记下这次走神/)
assert.match(modules, /这次的小困难/)
assert.match(modules, /提醒我想得太绝对时/)
assert.match(types, /prefill\??: string/)
assert.match(types, /AppTab = 'landing' \| 'intro' \| 'chat'/)

// 文案：隐私承诺与品牌
assert.match(home, /云舒学伴|云小舒/)
assert.match(landing, /云舒学伴|云小舒/)
assert.match(sidebar, /云舒学伴/)
assert.match(workspace, /'云小舒'|想聊点什么？学习、心情都可以/)
assert.match(consent, /仅使用学业功能|最多留7天/)
assert.match(consent, /本网站不保存对话记录/)
assert.doesNotMatch(consent, /原始对话默认不保存/)
// 昵称弹窗不得再承诺“不会传给女娲”（云函数实际会把 display_name 作为会话变量下发）
assert.doesNotMatch(readFileSync(new URL('../src/components/NicknameDialog.vue', import.meta.url), 'utf8'), /不会传给女娲/)

for (const source of [app, topbar, sidebar, actionMenu, workspace, home, landing, auth, consent, chatApi]) {
  assert.doesNotMatch(source, /心隅学伴/)
}
assert.doesNotMatch(home, /想法梳理|情绪支持|识别自动冒出的想法|没有固定脚本/)
assert.doesNotMatch(modules, /label: '想法梳理'|label: '情绪支持'|自动冒出的想法/)
assert.equal(existsSync(new URL('../.env.example', import.meta.url)), true)
assert.match(workspaceConfig, /allowBuilds:\s+[\s\S]*core-js-pure: true[\s\S]*esbuild: true/)

console.log('authentication, chat API, privacy, navigation, copy, records entry, and layout checks passed')
