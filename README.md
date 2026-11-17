# TRON 众筹数据总览

Airseekers TRON 360° 割草机器人 Kickstarter 项目的**第三方**静态分析站。页面数据来自公开的搜索 JSON、项目片段和 Community 页，在构建时打进站点，浏览器不会再请求 Kickstarter。

这不是 Kickstarter 官方网站，也不代表 Airseekers 的购买或售后页面。

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

## Flat Data

`.github/workflows/flat.yml` 使用 [`githubocto/flat` v3.4.0](https://github.com/githubocto/flat)（钉在 `cea5ee43fce40ef71501bf5724a00d45db11641d`）。Deno 先装 **1.46.3**，因为这个版本的 action 会用 `deno run --unstable` 调用 `deno/postprocess.ts`。

- 定时：每天 **02:00 UTC**（北京时间 10:00）
- 也可以在 Actions 里手动运行 `workflow_dispatch`
- 顺序请求搜索 JSON、项目 `.json` 片段、Community、FAQ
- 后处理会校验项目 id / slug / creator、拒绝挑战页和 HTML 冒充 JSON、拒绝负数，并拒绝把已有筹款数字覆盖成 0
- 失败时只更新 `data/tron/sources.json` 和快照里的来源状态，保留上一份有效数字
- 原始响应里的签名图片、视频和 `signature=` 地址不会进入接受后的文件
- 同一工作流接着构建并上传 Pages artifact。`GITHUB_TOKEN` 推上去的数据提交**不会**再触发别的 workflow，所以不能靠 push 去带动部署

再增加项目时，在 `data/projects.json` 加一项，并在 `flat.yml` 里按同样顺序加四步。抓取保持在同一个 job 里串行执行，避免两份 Flat 提交互相覆盖。

GitHub Actions 上的 `curl` 可能会被 Cloudflare 返回 403。工作流会把这种情况记成采集失败并继续用种子数据部署。在这种运行器上还没有验证过自动刷新成功。

## GitHub Pages

仓库保持 **private**。私有仓库的 Pages 需要组织方案支持（GitHub Team 或 Enterprise）；免费组织方案只给公开仓库提供 Pages。不要为了部署把仓库改成 public。

即使仓库是私有的，Pages 站点本身通常仍是公开的。部署成功后的项目站路径是：

`https://airseekers.github.io/kickstarter-dashboard/`

本环境的令牌读不到 Pages 设置（`GET /repos/airseekers/kickstarter-dashboard/pages` 返回 403）。工作流已经按官方 Pages actions 写好。合并到 `main` 之后，Actions 才会按默认分支上的 workflow 运行；若方案不允许私有 Pages，部署 job 会失败，而仓库可见性不应被改动。
