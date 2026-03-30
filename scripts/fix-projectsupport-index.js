/**
 * Script to fix ProjectSupport collection indexes
 * 
 * This script:
 * 1. Drops the old incorrect index (project_1_supporter_1_supportType_1)
 * 2. Removes duplicate/null entries
 * 3. Creates the correct indexes
 * 
 * Run with: node scripts/fix-projectsupport-index.js
 */

const mongoose = require("mongoose");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Import models
const ProjectSupport = require("../src/models/ProjectSupport");

async function fixProjectSupportIndexes() {
  try {
    console.log("[DATABASE FIX] Starting ProjectSupport index fix...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("[DATABASE FIX] Connected to MongoDB");

    // Get the collection
    const collection = mongoose.connection.collection("projectsupports");

    // List all current indexes
    console.log("[DATABASE FIX] Current indexes:");
    const currentIndexes = await collection.getIndexes();
    console.log(JSON.stringify(currentIndexes, null, 2));

    // Drop problematic indexes
    const problematicIndexes = [
      "project_1_supporter_1_supportType_1",
      "supporter_1",
      "supportType_1",
    ];

    for (const indexName of problematicIndexes) {
      try {
        if (currentIndexes[indexName]) {
          console.log(`[DATABASE FIX] Dropping index: ${indexName}`);
          await collection.dropIndex(indexName);
          console.log(`[DATABASE FIX] ✓ Index dropped: ${indexName}`);
        }
      } catch (err) {
        if (err.message.includes("index not found")) {
          console.log(`[DATABASE FIX] Index doesn't exist (safe to ignore): ${indexName}`);
        } else {
          console.error(`[DATABASE FIX] Error dropping index ${indexName}:`, err.message);
        }
      }
    }

    // Find and remove documents with null citizen or project values
    console.log("[DATABASE FIX] Checking for invalid records with null values...");
    const invalidCount = await ProjectSupport.countDocuments({
      $or: [{ citizen: null }, { project: null }, { projectRegistration: null }],
    });

    if (invalidCount > 0) {
      console.log(`[DATABASE FIX] Found ${invalidCount} invalid records with null values`);
      const result = await ProjectSupport.deleteMany({
        $or: [{ citizen: null }, { project: null }, { projectRegistration: null }],
      });
      console.log(`[DATABASE FIX] ✓ Deleted ${result.deletedCount} invalid records`);
    } else {
      console.log("[DATABASE FIX] No invalid records found");
    }

    // Remove duplicate supports (keep the first one for each citizen-project pair)
    console.log("[DATABASE FIX] Checking for duplicate supports...");
    const duplicates = await ProjectSupport.aggregate([
      {
        $group: {
          _id: { citizen: "$citizen", project: "$project" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length > 0) {
      console.log(`[DATABASE FIX] Found ${duplicates.length} duplicate citizen-project pairs`);
      let deletedCount = 0;

      for (const dup of duplicates) {
        // Keep the first ID, delete the rest
        const idsToDelete = dup.ids.slice(1);
        const result = await ProjectSupport.deleteMany({ _id: { $in: idsToDelete } });
        deletedCount += result.deletedCount;
        console.log(
          `[DATABASE FIX] Removed ${result.deletedCount} duplicate(s) for citizen ${dup._id.citizen} on project ${dup._id.project}`
        );
      }
      console.log(`[DATABASE FIX] ✓ Deleted ${deletedCount} duplicate records`);
    } else {
      console.log("[DATABASE FIX] No duplicate records found");
    }

    // Now rebuild correct indexes
    console.log("[DATABASE FIX] Creating correct indexes...");
    
    // Drop the default _id index if needed and recreate proper indexes
    await collection.dropIndex("supportId_1").catch(() => {
      console.log("[DATABASE FIX] supportId index doesn't exist or couldn't be dropped (safe)");
    });

    // Create indexes as defined in the schema
    await ProjectSupport.collection.createIndex(
      { supportId: 1 },
      { unique: true, sparse: true }
    );
    console.log("[DATABASE FIX] ✓ Created index on supportId (unique)");

    await ProjectSupport.collection.createIndex(
      { citizen: 1, project: 1 },
      { unique: true, sparse: true }
    );
    console.log("[DATABASE FIX] ✓ Created index on citizen + project (unique)");

    await ProjectSupport.collection.createIndex({ citizen: 1, createdAt: -1 });
    console.log("[DATABASE FIX] ✓ Created index on citizen + createdAt");

    await ProjectSupport.collection.createIndex({ project: 1, createdAt: -1 });
    console.log("[DATABASE FIX] ✓ Created index on project + createdAt");

    await ProjectSupport.collection.createIndex({ projectRegistration: 1 });
    console.log("[DATABASE FIX] ✓ Created index on projectRegistration");

    // Verify final indexes
    console.log("[DATABASE FIX] Final indexes:");
    const finalIndexes = await collection.getIndexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log(
      "[DATABASE FIX] ✓ ProjectSupport indexes fixed successfully!"
    );
    console.log("");
    console.log("SUMMARY:");
    console.log("- Dropped problematic old indexes");
    console.log("- Removed records with null required fields");
    console.log("- Removed duplicate citizen-project supports");
    console.log("- Created correct indexes");
    console.log("");
    console.log("The API should now work correctly!");

    process.exit(0);
  } catch (error) {
    console.error("[DATABASE FIX] Error:", error);
    process.exit(1);
  }
}

// Run the fix
fixProjectSupportIndexes();
