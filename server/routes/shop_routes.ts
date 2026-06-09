import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../dbconnection";
import type { shops } from "../types";
const shopRouter = Router();

// get list of all shops
shopRouter.get(
  "/get-shops",
  async function (req: Request, res: Response<shops>) {
    try {
      const query = await db.query(`SELECT json_agg(shops) AS shops
FROM shops;`);
      res.json(query.rows[0].shops);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  },
);

// Add shop
shopRouter.post("/add-shop", async (req: Request, res: Response) => {
  try {
    const form = req.body;
    await db.query(`INSERT INTO shops (shop_name) VALUES ($1)`, [
      form.shop_name,
    ]);
    res.json({ status: "success", values: form });
  } catch (error) {
    console.error("Error inserting item:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to add item to inventory" });
  }
});

// Edit shop details
shopRouter.post("/update-shop", async (req: Request, res: Response) => {
  const { id, shop_name } = req.body;
  if (!id || shop_name == null) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await db.query(
      `
      UPDATE shops
      SET shop_name = $1
      WHERE id = $2
      `,
      [shop_name, id],
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete shop
shopRouter.post("/delete-shop", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("BEGIN");
    await db.query("DELETE FROM event_shops WHERE shop_id = $1", [id]);
    await db.query("DELETE FROM equipment_lists WHERE shop_id = $1", [id]);
    await db.query("DELETE FROM shops WHERE id = $1", [id]);
    await db.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});
export default shopRouter;
