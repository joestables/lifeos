# Progress

How the work is going, as opposed to what LifeOS is. **Nothing here is a
spec**: if a plan and a spec disagree, the spec wins and the plan is fixed.

| File | What it holds | Updated |
|---|---|---|
| [plans/](plans/) | One plan per stage (or larger piece of work): the steps, their state, and what "done" means. | When the work starts, and as steps finish |
| [pull-requests.md](pull-requests.md) | Every pull request: what it changed, which documents it touched, and what it left for later. | In the same pull request, every time |

## Rules

- **Every pull request adds its own entry** to `pull-requests.md` before it
  is merged. The PR number is filled in once the PR is opened.
- **A plan's steps link to the documents they produce**, so a reader can go
  from the plan to the spec.
- **When a stage ends**, its plan is marked done and left as it is; the next
  stage gets a new plan.
