---
title: "GitHub Actions linting and testing"
---

"jdx to the rescue"

Yesterday I had the urge to tell my agent to use [nektos/act](https://github.com/nektos/act) to verify the workflow files, but before I did that, I checked the GitHub repo ... last commit from 5 months ago. I got a bit disappointed, because GitHub Actions [is still evolving](https://github.blog/changelog/2026-06-25-actions-steps-can-now-be-run-in-parallel/). I remembered seeing something called [actionlint](https://github.com/rhysd/actionlint), so I checked that: 6 months ago. I found an issue open on actionlint, from August, [asking about active forks](https://github.com/rhysd/actionlint/issues/719)... and sometimes you strike gold, [in a comment from just 3 days ago](https://github.com/rhysd/actionlint/issues/719#issuecomment-6109619704):

> I'm also maintaining a fork with an expanded scope to cover security and policy checks so it also replaces [zizmor](https://github.com/zizmorcore/zizmor): [https://github.com/jdx/jactionlint](https://github.com/jdx/jactionlint)

It was a comment from [jdx](https://jdx.dev/), famous for [mise](https://mise.jdx.dev/), [fnox](https://fnox.jdx.dev/) and many more things.

The splashy website is at [https://jactionlint.jdx.dev/](https://jactionlint.jdx.dev/).
