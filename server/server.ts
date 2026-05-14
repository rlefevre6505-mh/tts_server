import express from "express";
import type { Express, Request, Response } from "express";
import cors from "cors";
import { db } from "./dbconnection";
import type {
  FormValues,
  eventDetailsObject,
  note,
  notes,
  vehicle,
  vehicles,
  shop,
  shops,
  event,
} from "./types";

const app: Express = express();
app.use(express.json());
app.use(cors());
const PORT = 8080;
app.get("/", (req, res) =>
  res.json({ message: "Welcome to the Tom The Shop Logistics server" }),
);

// GET REQUESTS
// get all events for CalendarView
app.get(
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
app.post("/selected-event", async function (req: Request, res: Response) {
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
});
// get ALL event details
app.get("/all-event-details", async function (req: Request, res: Response) {
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
});
//
// get list of all shops
app.get("/get-shops", async function (req: Request, res: Response<shops>) {
  try {
    const query = await db.query(`SELECT json_agg(shops) AS shops
FROM shops;`);
    res.json(query.rows[0].shops);
  } catch (error) {
    console.error(`Error: ${error}`);
  }
});
//
// get list of all vehicles
app.get(
  "/get-vehicles",
  async function (req: Request, res: Response<vehicles>) {
    try {
      const query = await db.query(`SELECT json_agg(vehicles) AS vehicles
FROM vehicles;`);
      res.json(query.rows[0].vehicles);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  },
);
// get full inventory
app.get("/get-inventory", async function (req: Request, res: Response) {
  try {
    const query = await db.query(`SELECT * FROM full_inventory
      ORDER BY equipment_name ASC`);
    res.json(query.rows);
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ error: "Server error" });
  }
});

// POST REQUESTS
// add a new event
app.post(
  "/add-event",
  (req: Request<eventDetailsObject>, res: Response): void => {
    try {
      const form = req.body;
      const query = db.query(
        `INSERT INTO tts_events 
    (title, "start", "end", date_added, location, num_of_shops, num_of_vehicles)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          form.title,
          form.start,
          form.end,
          form.date_added,
          form.location,
          form.num_of_shops,
          form.num_of_vehicles,
        ],
      );
      res.json({ status: "success", values: form });
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  },
);
//
// add note to event
app.post("/add-note", async (req: Request, res: Response) => {
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
//
// Add inventory item
app.post("/add-inventory-item", async (req: Request, res: Response) => {
  try {
    const form = req.body;
    await db.query(
      `INSERT INTO full_inventory (equipment_name, current_amount) VALUES ($1, $2)`,
      [form.name, form.amount],
    );
    res.json({ status: "success", values: form });
  } catch (error) {
    console.error("Error inserting item:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to add item to inventory" });
  }
});
//
// Delete inventory item
app.post("/delete-inventory", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("BEGIN");
    await db.query("DELETE FROM equipment_lists WHERE equipment_id = $1", [id]);
    await db.query("DELETE FROM full_inventory WHERE id = $1", [id]);
    await db.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});
//
// Edit inventory item
app.post("/update-inventory", async (req: Request, res: Response) => {
  const { id, equipment_name, current_amount } = req.body;
  if (!id || equipment_name == null || current_amount == null) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await db.query(
      `
      UPDATE full_inventory
      SET equipment_name = $1,
          current_amount = $2
      WHERE id = $3
      `,
      [equipment_name, current_amount, id],
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Failed to update item" });
  }
});

// PUT REQUESTS
// edit event details
app.put("/edit-event", async (req: Request, res: Response) => {
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
    // 1. Update main event row
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
    // 2. Clear old shop assignments
    await client.query(`DELETE FROM event_shops WHERE event_id = $1`, [
      event_id,
    ]);
    // 3. Insert new shop assignments
    for (const shop of shops) {
      await client.query(
        `INSERT INTO event_shops (event_id, shop_id) VALUES ($1, $2)`,
        [event_id, shop.id],
      );
    }
    // 4. Clear old vehicle assignments
    await client.query(`DELETE FROM event_vehicles WHERE event_id = $1`, [
      event_id,
    ]);
    // 5. Insert new vehicle assignments
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

//START SERVER
app.listen(PORT, () => {
  console.info(`Server is running in port ${PORT}`);
});
