# TRON 众筹数据总览

Airseekers TRON 360° 割草机器人 Kickstarter 项目的**第三方**静态分析站。页面数据来自公开的搜索 JSON、项目片段和 Community 页，在构建时打进站点，浏览器不会再请求 Kickstarter。

这不是 Kickstarter 官方网站，也不代表 Airseekers 的购买或售后页面。

## 路径

构建 base 由环境变量 `VITE_BASE` 决定。不设置时默认 `/kickstarter-dashboard/`，给 GitHub Pages 用。Cloudflare 的生产构建把 `VITE_BASE` 设为 `/`，站点挂在域名根上。两种产物的入口相同：根路径是 ARANIX，`/ARANIX/` 和 `/TRON/` 是可刷新的静态页。资源地址跟 base 走，内部项目链接用 Vite 的 `BASE_URL`。

GitHub Pages 规范地址带末尾斜杠：

- `/kickstarter-dashboard/` 和没有末尾斜杠的 `/kickstarter-dashboard` 直接渲染 **ARANIX**，不是项目选择页，也不是 TRON。
- `/kickstarter-dashboard/ARANIX/` 与 `/kickstarter-dashboard/ARANIX`（`ARANIX.html`）是 ARANIX。
- `/kickstarter-dashboard/TRON/` 与 `/kickstarter-dashboard/TRON`（`TRON.html`）是 TRON。

每个地址都有自己的 `index.html` 或同名 `.html`，刷新和直接打开不依赖前端路由。GitHub Pages 的资源从 `/kickstarter-dashboard/assets/` 引出；`VITE_BASE=/` 时从 `/assets/` 引出。子目录页面也能加载。

## 当前数据

仓库里的数字是 **2026-11-16 约 23:12（北京时间，UTC+8）** 的人工种子快照，不是一次被标成“刚刚抓取”的 Flat Data 结果。

| 项 | 值 |
| --- | --- |
| 项目 | `tron-360-ai-vision-robot-mower-smooth-lawns-and-fertilizing` |
| 创作者 | `airseekers` |
| 公开 id | `1873694145` |
| 已筹 / 目标 | HK$ 17,572,828 / HK$ 156,576 |
| 支持人数 | 1,389（首次 681，既有 708） |
| 达成率 | 11,223.193848354793% |

平均每位支持金额是 `已筹 ÷ 人数`，不是商品单价。新老支持者指的是此人以前有没有在 Kickstarter 支持过别的项目，不是 Airseekers 品牌复购。国家与城市只有公开 Top 10。`usd_pledged`（静态历史美元 `2244482.60289708`）和 `converted_pledged_amount`（2,250,050）是两套口径。社区页页眉 “Last updated October 19, 2026” 只是页面文案，不是地区数据的更新时间。

没有奖励档销量、地区金额、支持者身份，也没有编造的历史曲线。趋势图要等 Flat Data 真正接受至少一条新快照之后才会出现。

ARANIX 使用 2026-11-17 约 10:51（北京时间）的公开搜索 JSON，`term=ARANIX`，精确匹配 slug `aranix-the-worlds-first-4wd-4ws-all-terrain-robotic-mower`、id `103950657`。当时 `state=submitted`，`pledged`、`goal`、`backers_count` 都是接口里的 0，`usd_pledged` 为 null。这次读取可能带缓存，不是 Flat Data 抓取。Community 超时，项目片段和 FAQ 没拿到，所以地区、新老支持者和互动计数保持空，不用 0 或 TRON 的数字填上。核对过的字段在 `data/aranix/public-search.json`，已去掉签名图片地址。

两个项目的 Flat Data 步骤分开写入 `data/raw/tron/` 和 `data/raw/aranix/`。一边失败只更新那一边的来源状态。

## 本地

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

站点 base 是 `/kickstarter-dashboard/`。预览地址是 `http://127.0.0.1:4173/kickstarter-dashboard/`。

## 采集与历史

定时在 GitHub Actions 里，不是外部机器人。Actions 的 cron 是尽力而为，可能延迟，不保证卡在那一分钟。真正跑起来时才会抓取；抓不到就保持上次成功的文件，不部署。

| 项目 | 生效时间 | 北京时间 | 说明 |
| --- | --- | --- | --- |
| ARANIX | `17 * * * *` | 每小时第 17 分 | 每次定时都抓 |
| TRON | 同一工作流里 UTC 小时为 2 | 每天 10:17 | 评论、更新和地区仍会变，所以成功后也每天抓一次 |

只有一条每小时定时，避免 02:17 同时触发两份工作流。TRON 在那一次运行里按 UTC 小时放行。手动运行可选 `aranix`、`tron` 或 `both`，默认 `aranix`。

每次运行用 `github.run_id` 和 `github.run_attempt` 做记录编号。同一个编号重跑不会再写一份。编号不同、数值没变，仍会追加一条成功观测，这样间隔还在。

历史 schema 是 2。成功观测写在 `data/<项目>/history/observations/年/月/<时间>-<运行编号>.json`，里面是当次接受的整份业务快照：金额、状态、生命周期日期、地区数组、新老支持者、互动计数、货币和汇率，以及每个字段是当次测到、沿用、人工种子，还是不可用。失败和挑战页可以写成 `history/attempts/年/月/`，只记尝试和错误，不新增观测，也不把数字改成 0。只有同一次运行接受了观测，或汇率日/汇率数值确实变了，这些文件才会随那次提交进入仓库。单独的失败不提交，也不部署。`history/manifest.json` 是索引，页面用它画趋势；完整快照留在分区文件里。已提交的历史只追加，工作流不会删它。

种子快照留在 `latest.json` 和 `history/` 下的 `manual_seed` 基线里，provenance 仍是人工读取。它不会被写成 Flat Data 观测，趋势图也不把它和后来的点连起来。沿用的地区分布会标成 `manual_seed` 或 `carried_forward`，观测时间仍是上次真正接受的时间，不是这次失败的时间。项目创建、上线和截止是生命周期时间，不是采集时间。

页面上的「采集节奏」显示 cron、成功观测次数和最近成功时间。同一字段至少两次 `observed` 数值之后才画线；中间缺失会断开，不会当成已知变化。现在仓库里还没有 Flat Data 成功观测，所以还没有趋势曲线。

金额切换默认人民币，可选美元。换算使用 `data/fx/latest.json` 里缓存的 Frankfurter / 欧洲央行参考汇率，不在浏览器里实时请求。这是估算，汇率日和检索时间写在页脚。Kickstarter 的 `usd_pledged` 与 `converted_pledged_amount` 保持原值。汇率抓取失败时不改写上一份有效汇率文件；没有上一份就不换算。人数和百分比不换算。

后处理会校验项目 id / slug / creator、拒绝挑战页、拒绝负数，并拒绝把已有正数筹款覆盖成 0。签名图片和 `signature=` 地址不会进入接受后的文件。

采集和 GitHub Pages 部署在同一个 workflow，但部署发生在数据提交已经出现在 `origin/main` 之后。`GITHUB_TOKEN` 产生的 push 不会再启动 `ci.yml`，所以不能靠这次 push 去触发 CI 里的 Pages 部署。Flat Data workflow 自己在 `git push` 成功并且 `HEAD` 等于 `origin/main` 之后才构建、上传 artifact、运行 `deploy-pages`。

下面几种情况不提交，也不部署：Kickstarter 请求失败、只有失败记录或来源状态变化、汇率数值和汇率日都没变。汇率文件字节数相同不等于没变化；比较的是汇率日和 USD/CNY。数值没变的成功观测仍会追加文件，提交到 `main` 后再部署。失败响应不会写进已有的 raw 或 `latest.json`。

GitHub 托管运行器直接请求 Kickstarter 会收到 HTTP 403。工作流因此不在运行器上伪装浏览器或跟随挑战页跳转。设置仓库变量 `KICKSTARTER_FETCH_BASE` 之后，Kickstarter 的四个公开地址改由 Cloudflare Worker 代为请求；Frankfurter 汇率仍然由运行器直接请求。变量还没设置时，403 会被记在日志里，仓库保持原样。

再增加项目时，在 `data/projects.json` 加一项。Worker 只放行 `www.kickstarter.com` 上该创建者的 search、项目 JSON、community 和 faqs。抓取在同一个 job 里串行执行。

## GitHub Pages

仓库已经公开，Pages 源是 GitHub Actions。站点仍在：

`https://airseekers.github.io/kickstarter-dashboard/`

`ci.yml` 和 `flat.yml` 的构建都不设置 `VITE_BASE`，所以 Pages 继续使用 `/kickstarter-dashboard/`。采集 cron 也没有改。

## Cloudflare Pages

这是同一仓库的第二份静态托管，不替换 GitHub Pages，也不需要额外的 Cloudflare 密钥或 Wrangler 部署。Git integration 里把生产分支指到 `main` 后，使用：

| 设置 | 值 |
| --- | --- |
| 环境变量 | `VITE_BASE=/`，`NODE_VERSION=22` |
| Build command | `npm run build` |
| Build output directory | `dist` |

安装命令保持 Cloudflare 默认，它会按 lockfile 安装。根路径打开 ARANIX，`/ARANIX/` 和 `/TRON/` 各自是静态页，刷新仍停在当前项目。

Cloudflare Pages 已经用 Git integration 连接这个仓库，生产分支是 `main`，站点是 https://kickstarter-dashboard.pages.dev/ 。数据提交说明是 `Data: <时间> (accepted_observation)` 或 `Data: <时间> (fx_rates_changed)`，没有 `[CI Skip]`、`[CI-Skip]`、`[Skip CI]`、`[Skip-CI]`、`[CF-Pages-Skip]`。按 Cloudflare 文档，这种真实 push 会部署。失败和没有实质文件变化时不会产生 push，因此也不该出现新的 Pages 部署。

验证：一次成功的采集之后，`git rev-parse origin/main` 等于该 `Data:` 提交。Cloudflare Pages 的部署列表里应出现同一个 SHA，https://kickstarter-dashboard.pages.dev/ 的资源和数据对应该提交。一次 403 或汇率无变化的运行没有新提交，部署列表里也不该出现新 SHA。GitHub Pages 则看同一次 Flat Data workflow 里、push 之后的 `deploy` job。

## Cloudflare Worker

Worker 源码在 `workers/kickstarter-fetch/`。它只请求允许列表里的 Kickstarter 公开 URL，不带 cookie，不跟随重定向，也不改现有 Pages 项目。部署要用已连接的 Cloudflare MCP 执行下面的 `execute` 代码，不要把 token 交给别人。先读 `workers/kickstarter-fetch/src/index.js` 和 `allowlist.js` 的全文，替换代码里的占位字符串。

1. 确认账号：`async () => cloudflare.request({ method: "GET", path: "/accounts" })`
2. 上传脚本。`accountId` 用上一步的账号。`indexJs` 和 `allowlistJs` 是仓库里两个文件的原文。

```js
async () => {
  const indexJs = `...index.js 原文...`
  const allowlistJs = `...allowlist.js 原文...`
  const metadata = { main_module: "index.js", compatibility_date: "2026-11-17" }
  const form = new FormData()
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
  form.append("index.js", new Blob([indexJs], { type: "application/javascript+module" }), "index.js")
  form.append("allowlist.js", new Blob([allowlistJs], { type: "application/javascript+module" }), "allowlist.js")
  return cloudflare.request({
    method: "PUT",
    path: `/accounts/${accountId}/workers/scripts/kickstarter-fetch`,
    body: form,
  })
}
```

3. 打开 workers.dev 子域，不要给 `kickstarter-dashboard.pages.dev` 加路由：

```js
async () => {
  const subdomain = await cloudflare.request({ method: "GET", path: `/accounts/${accountId}/workers/subdomain` })
  await cloudflare.request({
    method: "POST",
    path: `/accounts/${accountId}/workers/scripts/kickstarter-fetch/subdomain`,
    body: { enabled: true },
  })
  return subdomain
}
```

4. 把仓库 Actions 变量 `KICKSTARTER_FETCH_BASE` 设为 `https://kickstarter-fetch.<上一步 subdomain>.workers.dev`。这是地址，不是 secret。不要改 Pages 项目里的 `VITE_BASE=/`、构建命令 `npm run build` 或输出目录 `dist`。
5. 手动跑 Flat Data workflow，项目选 `aranix`。日志里应出现 `worker 200`，并且 `main` 上出现新的 `Data:` 提交后才有 `deploy`。
