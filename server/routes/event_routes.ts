import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../dbconnection";
import type { event } from "../types";
const eventRouter = Router();

// get basic event details for CalendarView
eventRouter.get(
  "/stored-events",
  async function (req: Request, res: Response<event[]>) {
    try {
      const query = await db.query(
        `SELECT id, title, "start", "end" FROM tts_events;`,
      );
      const data = res.json(query.rows);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  },
);

// get selected event details
eventRouter.post(
  "/selected-event",
  async function (req: Request, res: Response) {
    try {
      const { id } = req.body;
      const query = await db.query(
        `
      SELECT 
        e.*,
        -- Vehicles
        COALESCE(
          (
            SELECT json_agg(jsonb_build_object(
              'id', v.id,
              'vehicle_name', v.vehicle_name,
              'vehicle_reg', v.vehicle_reg
            ))
            FROM event_vehicles ev
            JOIN vehicles v ON v.id = ev.vehicle_id
            WHERE ev.event_id = e.id
          ),
          '[]'
        ) AS vehicles,
        -- Shops
        COALESCE(
          (
            SELECT json_agg(jsonb_build_object(
              'id', s.id,
              'shop_name', s.shop_name
            ))
            FROM event_shops es
            JOIN shops s ON s.id = es.shop_id
            WHERE es.event_id = e.id
          ),
          '[]'
        ) AS shops,
        -- Notes
        COALESCE(
          (
            SELECT json_agg(jsonb_build_object(
              'note', n.note
            ))
            FROM notes n
            WHERE n.event_id = e.id
          ),
          '[]'
        ) AS notes
      FROM tts_events e
      WHERE e.id = $1
      GROUP BY e.id
      `,
        [id],
      );
      return res.json(query.rows[0]);
    } catch (error) {
      console.error(`Error: ${error}`);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// get full event details
eventRouter.get(
  "/all-event-details",
  async function (req: Request, res: Response) {
    try {
      const query = await db.query(
        `
      SELECT 
        e.*,
        -- Vehicles
        COALESCE(
          (
            SELECT json_agg(jsonb_build_object(
              'id', v.id,
              'vehicle_name', v.vehicle_name,
              'vehicle_reg', v.vehicle_reg
            ))
            FROM event_vehicles ev
            JOIN vehicles v ON v.id = ev.vehicle_id
            WHERE ev.event_id = e.id
          ),
          '[]'
        ) AS vehicles,
        -- Shops
        COALESCE(
          (
            SELECT json_agg(jsonb_build_object(
              'id', s.id,
              'shop_name', s.shop_name
            ))
            FROM event_shops es
            JOIN shops s ON s.id = es.shop_id
            WHERE es.event_id = e.id
          ),
          '[]'
        ) AS shops,
        -- Notes
        COALESCE(
          (
            SELECT json_agg(jsonb_build_object(
              'note', n.note
            ))
            FROM notes n
            WHERE n.event_id = e.id
          ),
          '[]'
        ) AS notes
      FROM tts_events e
      ORDER BY e.start ASC
      `,
      );
      return res.json(query.rows);
    } catch (error) {
      console.error(`Error: ${error}`);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// edit event details
eventRouter.put("/edit-event", async (req: Request, res: Response) => {
  const client = await db.connect();
  try {
    const {
      event_id,
      title,
      start,
      end,
      location,
      num_of_shops,
      shops,
      num_of_vehicles,
      vehicles,
    } = req.body;
    await client.query("BEGIN");
    // update main event row
    await client.query(
      `
      UPDATE tts_events
      SET title = $1,
          "start" = $2,
          "end" = $3,
          location = $4,
          num_of_shops = $5,
          num_of_vehicles = $6
      WHERE id = $7
      `,
      [title, start, end, location, num_of_shops, num_of_vehicles, event_id],
    );
    // clear old shop assignments
    await client.query(`DELETE FROM event_shops WHERE event_id = $1`, [
      event_id,
    ]);
    // insert new shop assignments
    for (const shop of shops) {
      await client.query(
        `INSERT INTO event_shops (event_id, shop_id) VALUES ($1, $2)`,
        [event_id, shop.id],
      );
    }
    // clear old vehicle assignments
    await client.query(`DELETE FROM event_vehicles WHERE event_id = $1`, [
      event_id,
    ]);
    // insert new vehicle assignments
    for (const vehicle of vehicles) {
      await client.query(
        `INSERT INTO event_vehicles (event_id, vehicle_id) VALUES ($1, $2)`,
        [event_id, vehicle.id],
      );
    }
    await client.query("COMMIT");
    res.json({ status: "success" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error editing event:", error);
    res.status(500).json({ status: "error", message: "Failed to edit event" });
  } finally {
    client.release();
  }
});

// add event
eventRouter.post("/add-event", async (req: Request, res: Response) => {
  const client = await db.connect();
  try {
    const {
      title,
      start,
      end,
      date_added,
      location,
      num_of_shops,
      shops,
      num_of_vehicles,
      vehicles,
    } = req.body;
    await client.query("BEGIN");
    // insert main event row and return generated event ID
    const insertEventResult = await client.query(
      `
      INSERT INTO tts_events 
      (title, "start", "end", date_added, location, num_of_shops, num_of_vehicles)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [title, start, end, date_added, location, num_of_shops, num_of_vehicles],
    );
    const newEventId = insertEventResult.rows[0].id;
    // insert shop assignments (if any)
    if (Array.isArray(shops) && shops.length > 0) {
      for (const shopId of shops) {
        await client.query(
          `INSERT INTO event_shops (event_id, shop_id) VALUES ($1, $2)`,
          [newEventId, shopId],
        );
      }
    }
    // insert vehicle assignments (if any)
    if (Array.isArray(vehicles) && vehicles.length > 0) {
      for (const vehicleId of vehicles) {
        await client.query(
          `INSERT INTO event_vehicles (event_id, vehicle_id) VALUES ($1, $2)`,
          [newEventId, vehicleId],
        );
      }
    }
    await client.query("COMMIT");
    res.json({
      status: "success",
      event_id: newEventId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding event:", error);
    res.status(500).json({ status: "error", message: "Failed to add event" });
  } finally {
    client.release();
  }
});

// delete event
eventRouter.post("/delete-event", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("BEGIN");
    await db.query("DELETE FROM notes WHERE event_id = $1", [id]);
    await db.query("DELETE FROM event_shops WHERE event_id = $1", [id]);
    await db.query("DELETE FROM event_vehicles WHERE event_id = $1", [id]);
    await db.query("DELETE FROM tts_events WHERE id = $1", [id]);
    await db.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// add note to event
eventRouter.post("/add-note", async (req: Request, res: Response) => {
  try {
    const form = req.body;
    await db.query(`INSERT INTO notes (note, event_id) VALUES ($1, $2)`, [
      form.note,
      form.event_id,
    ]);
    res.json({ status: "success", values: form });
  } catch (error) {
    console.error("Error inserting note:", error);
    res.status(500).json({ status: "error", message: "Failed to add note" });
  }
});

export default eventRouter;
