<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Tournament scores are saved only by server functions that replay the game log (Blast moves, Flippy seed + flap steps) and call `submit_tournament_score` with the service-role client; the DB function is closed to players so a client can never claim a raw score.
- Flippy physics runs in fixed one-frame steps with a seeded PRNG; never reintroduce `Math.random` or variable `dt` into `flippy-engine.ts` gameplay, or server replay will diverge.
