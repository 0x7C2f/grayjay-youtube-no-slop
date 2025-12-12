require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML forms and admin interface)
app.use(express.static("."));

// Serve the AI bands database
app.get("/ai-bands.json", (req, res) => {
	try {
		const aiBands = JSON.parse(
			fs.readFileSync(path.join(__dirname, "ai-bands.json"), "utf8"),
		);
		res.json(aiBands);
	} catch (error) {
		res.status(500).json({ error: "Failed to load AI bands database" });
	}
});

// Serve plugin config (for version checking)
app.get("/YoutubeConfig.json", (req, res) => {
	try {
		const config = JSON.parse(
			fs.readFileSync(path.join(__dirname, "YoutubeConfig.json"), "utf8"),
		);
		res.json(config);
	} catch (error) {
		res.status(500).json({ error: "Failed to load plugin config" });
	}
});

// Check for pending submissions
app.get("/api/check-pending", (req, res) => {
	try {
		const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf8"));
		const pendingCount = submissions.filter(
			(s) => s.status === "pending",
		).length;
		res.json({ pendingCount });
	} catch (error) {
		res.status(500).json({ error: "Failed to check pending submissions" });
	}
});

// Store submissions in a JSON file
const SUBMISSIONS_FILE = path.join(__dirname, "submissions.json");

// Ensure submissions file exists
if (!fs.existsSync(SUBMISSIONS_FILE)) {
	fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
}

// API endpoint for form submissions
app.post("/api/submit-ai-band", (req, res) => {
	try {
		const {
			artistName,
			youtubeUrl,
			verificationLinks,
			otherPlatforms,
			additionalInfo,
		} = req.body;

		// Basic validation
		if (!artistName || !youtubeUrl || !verificationLinks) {
			return res.status(400).json({
				error:
					"Missing required fields: artistName, youtubeUrl, verificationLinks",
			});
		}

		// Validate YouTube URL
		if (
			!youtubeUrl.includes("youtube.com") &&
			!youtubeUrl.includes("youtu.be")
		) {
			return res.status(400).json({
				error: "Invalid YouTube URL",
			});
		}

		// Create submission object
		const submission = {
			id: Date.now().toString(),
			timestamp: new Date().toISOString(),
			artistName: artistName.trim(),
			youtubeUrl: youtubeUrl.trim(),
			verificationLinks: verificationLinks
				.split("\n")
				.map((link) => link.trim())
				.filter((link) => link),
			otherPlatforms: otherPlatforms
				? otherPlatforms
						.split("\n")
						.map((link) => link.trim())
						.filter((link) => link)
				: [],
			additionalInfo: additionalInfo ? additionalInfo.trim() : "",
			status: "pending", // pending, approved, rejected
			reviewed: false,
		};

		// Load existing submissions
		const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf8"));

		// Add new submission
		submissions.push(submission);

		// Save back to file
		fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

		console.log(`New AI band submission: ${artistName}`);

		res.json({
			success: true,
			message: "Submission received successfully",
			submissionId: submission.id,
		});
	} catch (error) {
		console.error("Error processing submission:", error);
		res.status(500).json({
			error: "Internal server error",
		});
	}
});

// Admin endpoint to get submissions (protected by simple auth)
app.get("/api/admin/submissions", (req, res) => {
	// Simple auth check - replace with proper authentication
	const authToken = req.headers.authorization;
	if (!authToken || authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf8"));
		res.json(submissions);
	} catch (error) {
		res.status(500).json({ error: "Error reading submissions" });
	}
});

// Admin endpoint to approve/reject submissions
app.post("/api/admin/submissions/:id", (req, res) => {
	const authToken = req.headers.authorization;
	if (!authToken || authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const { id } = req.params;
		const { action, aiBandsPath } = req.body; // action: 'approve' or 'reject'

		const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf8"));
		const submissionIndex = submissions.findIndex((s) => s.id === id);

		if (submissionIndex === -1) {
			return res.status(404).json({ error: "Submission not found" });
		}

		const submission = submissions[submissionIndex];

		if (action === "approve") {
			// Add to ai-bands.json
			const aiBandsFile = path.join(
				__dirname,
				aiBandsPath || "../ai-bands.json",
			);
			const aiBands = JSON.parse(fs.readFileSync(aiBandsFile, "utf8"));

			// Create new entry
			const newEntry = {
				name: submission.artistName,
				dateAdded: new Date().toISOString().split("T")[0],
				dateUpdated: null,
				comments: submission.additionalInfo || null,
				tags: ["ai-generated"],
				youtube: submission.youtubeUrl,
				urls: submission.verificationLinks,
			};

			// Add other platforms if provided
			if (submission.otherPlatforms.length > 0) {
				// Try to identify platform from URL
				submission.otherPlatforms.forEach((platformUrl) => {
					if (platformUrl.includes("spotify.com")) {
						newEntry.spotify = platformUrl;
					} else if (platformUrl.includes("music.apple.com")) {
						newEntry.apple = platformUrl;
					} else if (platformUrl.includes("tiktok.com")) {
						newEntry.tiktok = platformUrl;
					} else if (platformUrl.includes("instagram.com")) {
						newEntry.instagram = platformUrl;
					} else if (platformUrl.includes("amazon.com")) {
						newEntry.amazon = platformUrl;
					}
				});
			}

			aiBands.push(newEntry);
			fs.writeFileSync(aiBandsFile, JSON.stringify(aiBands, null, 2));

			submission.status = "approved";
		} else if (action === "reject") {
			submission.status = "rejected";
		}

		submission.reviewed = true;
		submissions[submissionIndex] = submission;

		fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

		res.json({ success: true, message: `Submission ${action}d` });
	} catch (error) {
		console.error("Error processing admin action:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.listen(PORT, () => {
	console.log(`AI Band submission server running on port ${PORT}`);
});
