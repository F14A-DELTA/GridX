Stop containers:

npm run docker:down
Start dev stack (build + run):

npm run docker:dev
Restart (stop then start):

PowerShell:
npm run docker:down; npm run docker:dev
Also useful:

Build only:
npm run docker:build
Start without rebuild:
npm run docker:up
Tail logs:
npm run docker:logs
Open shell in container:
npm run docker:exec -- sh