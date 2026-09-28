# N-0029 legacy System32 Bash acceptance

The LF-normalized audit now parses through `C:\Windows\System32\bash.exe`, but this
host's WSL environment has no `rg`. Observed on 2026-09-28 with a 20-second bounded
subprocess: `rg: command not found`, followed by the intended fail-closed audit error
(status 127). Git Bash passes all 27 checks.

No WSL install, environment modification or network change was performed. If the old
System32 acceptance is retained, provide a WSL environment with ripgrep available and
run `cd /mnt/c/Reclaim/app && npm run audit:training-dual-paths`. Require 27/27 and a
zero exit. Otherwise the operator must explicitly retire that legacy criterion in
favour of the canonical Git Bash gate; the agent does not silently change acceptance.
