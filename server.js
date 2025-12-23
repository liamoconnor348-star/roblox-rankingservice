const express = require("express");
const noblox = require("noblox.js");

const app = express();
app.use(express.json());

const GROUP_ID = Number(process.env.GROUP_ID);
const COOKIE = process.env.COOKIE;

// =====================
// LOGIN
// =====================
async function login() {
    if (!COOKIE) {
        console.error("❌ COOKIE missing in Replit Secrets");
        process.exit(1);
    }

    try {
        const user = await noblox.setCookie(COOKIE);
        console.log("✅ Logged in as:", user.UserName);
    } catch (err) {
        console.error("❌ Cookie login failed:", err.message);
        process.exit(1);
    }
}
login();

// =====================
// ROLE LOGIC (DUPES SAFE)
// =====================
async function changeRank(username, direction) {
    const userId = await noblox.getIdFromUsername(username);
    const roles = await noblox.getRoles(GROUP_ID);

    // Sort by rank, then name (handles duplicates)
    const sorted = roles.sort(
        (a, b) => a.rank - b.rank || a.name.localeCompare(b.name)
    );

    const currentRoleName = await noblox.getRankNameInGroup(GROUP_ID, userId);
    const index = sorted.findIndex(r => r.name === currentRoleName);

    if (index === -1) throw new Error("User role not found");

    let newIndex = index;
    if (direction === "promote") newIndex = Math.min(index + 1, sorted.length - 1);
    if (direction === "demote") newIndex = Math.max(index - 1, 0);

    const targetRole = sorted[newIndex];
    await noblox.setRank(GROUP_ID, userId, targetRole.name);

    return targetRole.name;
}

// =====================
// API ENDPOINT
// =====================
app.post("/command", async (req, res) => {
    const { command } = req.body;
    if (!command) return res.json({ error: "No command" });

    const args = command.split(" ");
    const cmd = args[0].toLowerCase();

    try {
        if (cmd === "!promote") {
            const role = await changeRank(args[1], "promote");
            return res.json({ success: `Promoted to ${role}` });
        }

        if (cmd === "!demote") {
            const role = await changeRank(args[1], "demote");
            return res.json({ success: `Demoted to ${role}` });
        }

        if (cmd === "!setrank") {
            const username = args[1];
            const roleName = args.slice(2).join(" ");

            const userId = await noblox.getIdFromUsername(username);
            const roles = await noblox.getRoles(GROUP_ID);
            const role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());

            if (!role) throw new Error("Role not found");

            await noblox.setRank(GROUP_ID, userId, role.name);
            return res.json({ success: `Set rank to ${role.name}` });
        }

        res.json({ error: "Unknown command" });
    } catch (err) {
        res.json({ error: err.message });
    }
});

// =====================
// START
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Running on port", PORT));
