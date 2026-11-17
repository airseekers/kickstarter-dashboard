# TRON 众筹数据总览

Airseekers TRON 360° 割草机器人 Kickstarter 项目的**第三方**静态分析站。页面数据来自公开的搜索 JSON、项目片段和 Community 页，在构建时打进站点，浏览器不会再请求 Kickstarter。

这不是 Kickstarter 官方网站，也不代表 Airseekers 的购买或售后页面。

## 路径

静态站点 base 是 `/kickstarter-dashboard/`。规范地址带末尾斜杠：

- `/kickstarter-dashboard/` 和没有末尾斜杠的 `/kickstarter-dashboard` 直接渲染 **ARANIX**，不是项目选择页，也不是 TRON。
- `/kickstarter-dashboard/ARANIX/` 与 `/kickstarter-dashboard/ARANIX`（`ARANIX.html`）是 ARANIX。
- `/kickstarter-dashboard/TRON/` 与 `/kickstarter-dashboard/TRON`（`TRON.html`）是 TRON。

每个地址都有自己的 `index.html` 或同名 `.html`，刷新和直接打开不依赖前端路由。资源路径从 `/kickstarter-dashboard/assets/` 引出，子目录页面也能加载。

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

## Flat Data 与历史

`.github/workflows/flat.yml` 使用 [`githubocto/flat` v3.4.0](https://github.com/githubocto/flat)（钉在 `cea5ee43fce40ef71501bf5724a00d45db11641d`）。Deno 先装 **1.46.3**，因为这个版本的 action 会用 `deno run --unstable` 调用 `deno/postprocess.ts`。

定时在 GitHub Actions 里，不是外部机器人。Actions 的 cron 是尽力而为，可能延迟，不保证卡在那一分钟。

| 项目 | cron（UTC） | 北京时间 | 说明 |
| --- | --- | --- | --- |
| ARANIX | `17 * * * *` | 每小时第 17 分 | 定时只抓 ARANIX |
| TRON | 无 | 不定时 | 众筹已成功，数字不再定时抓取 |

手动运行默认也是 ARANIX。只有在 Actions 里明确选择 `tron` 才会再抓一次 TRON。

每次运行用 `github.run_id` 和 `github.run_attempt` 做记录编号。同一个编号重跑不会再写一份。编号不同、数值没变，仍会追加一条成功观测，这样间隔还在。

历史 schema 是 2。成功观测写在 `data/<项目>/history/observations/年/月/<时间>-<运行编号>.json`，里面是当次接受的整份业务快照：金额、状态、生命周期日期、地区数组、新老支持者、互动计数、货币和汇率，以及每个字段是当次测到、沿用、人工种子，还是不可用。失败和挑战页写在 `history/attempts/年/月/`，只记尝试和错误，不新增观测，也不把数字改成 0。`history/manifest.json` 是索引，页面用它画趋势；完整快照留在分区文件里。这些文件只追加，工作流不会删历史。

种子快照留在 `latest.json` 和 `history/` 下的 `manual_seed` 基线里，provenance 仍是人工读取。它不会被写成 Flat Data 观测，趋势图也不把它和后来的点连起来。沿用的地区分布会标成 `manual_seed` 或 `carried_forward`，观测时间仍是上次真正接受的时间，不是这次失败的时间。项目创建、上线和截止是生命周期时间，不是采集时间。

页面上的「采集节奏」显示 cron、成功观测次数和最近成功时间。同一字段至少两次 `observed` 数值之后才画线；中间缺失会断开，不会当成已知变化。现在仓库里还没有 Flat Data 成功观测，所以还没有趋势曲线。

后处理会校验项目 id / slug / creator、拒绝挑战页、拒绝负数，并拒绝把已有正数筹款覆盖成 0。签名图片和 `signature=` 地址不会进入接受后的文件。

采集和部署在同一个 workflow。`GITHUB_TOKEN` 提交的数据不会再触发别的 workflow，所以不能靠 push 去带动 Pages。

再增加项目时，在 `data/projects.json` 加一项，并在 `flat.yml` 里按项目加上四步和对应的定时条件。抓取保持在同一个 job 里串行执行，避免两份提交互相覆盖。

GitHub Actions 上的 `curl` 可能会被 Cloudflare 返回 403。工作流会把这种情况记成采集失败并继续用种子数据部署。在这种运行器上还没有验证过自动刷新成功。

## GitHub Pages

仓库保持 **private**。私有仓库的 Pages 需要组织方案支持（GitHub Team 或 Enterprise）；免费组织方案只给公开仓库提供 Pages。不要为了部署把仓库改成 public。

即使仓库是私有的，Pages 站点本身通常仍是公开的。部署成功后的项目站路径是：

`https://airseekers.github.io/kickstarter-dashboard/`

本环境的令牌读不到 Pages 设置（`GET /repos/airseekers/kickstarter-dashboard/pages` 返回 403）。工作流已经按官方 Pages actions 写好。合并到 `main` 之后，Actions 才会按默认分支上的 workflow 运行；若方案不允许私有 Pages，部署 job 会失败，而仓库可见性不应被改动。
