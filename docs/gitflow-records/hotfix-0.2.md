## Production hotfix 0.2

A severe production issue is handled on the hotfix line: malformed stroke payloads must be rejected before broadcast so one invalid sender cannot disrupt the shared drawing session.

The server's point, color, width, and point-count validation is the production guardrail for this patch.

Release marker: 0.2
