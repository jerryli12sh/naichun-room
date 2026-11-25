# 乃春的房间

An interactive miniature-figurine dorm room (NUS PGPR Type C, 12/7/M) for 黄屹霄 (乃春 / 黄总). 笑着过日子.

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # static site in dist/
```

Deploy: GitHub Pages (`BASE_PATH=/naichun-room/ npm run build`) or Cloudflare Pages (`BASE_PATH=/`).

The site opens at the door of 12/7/M: click the door (or press Space) to knock three times.
Debug URL params: `?room` skips the door, `?mood=sleeping|headphones|croc|eating` forces the door mood.

Controls: drag to orbit, scroll to zoom, click an object to fly to it, Esc or double-click empty space to go back.

See `docs/BRANCHES.md` for the branch plan.
