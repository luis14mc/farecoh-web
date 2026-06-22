import { createClient } from "@supabase/supabase-js";
import { pinkFloydEvent } from "@/data/event";
import type { Event, Customer, Order, Ticket } from "@/lib/ticketing";

// Read environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are valid (not undefined, empty, or placeholder)
const hasValidCredentials = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith("https://") && 
  supabaseAnonKey.length > 20;

const SEED_EVENT: Event = pinkFloydEvent;

// Seed initial mock data for the admin dashboard overview
const INITIAL_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Carlos Mendoza", email: "carlos@gmail.com", phone: "+504 9999-8888", created_at: new Date().toISOString() },
  { id: "c2", name: "LucÃ­a Torres", email: "lucia.torres@yahoo.com", phone: "+504 9876-5432", created_at: new Date().toISOString() },
  { id: "c3", name: "Marco Polo", email: "marco@polo.com", phone: "+504 9900-1111", created_at: new Date().toISOString() },
  { id: "c4", name: "Elena Gil", email: "elena@gil.com", phone: "+504 9123-4567", created_at: new Date().toISOString() },
  { id: "c5", name: "Raul Perez", email: "raul@perez.com", phone: "+504 9555-4433", created_at: new Date().toISOString() }
];

const INITIAL_ORDERS: Order[] = [
  { id: "o1", customer_id: "c1", event_id: "pink-floyd", ticket_count: 2, total_amount: 1000.00, status: "paid", created_at: new Date("2026-06-18T10:00:00").toISOString() },
  { id: "o2", customer_id: "c2", event_id: "pink-floyd", ticket_count: 2, total_amount: 1000.00, status: "paid", created_at: new Date("2026-06-18T14:30:00").toISOString() },
  { id: "o3", customer_id: "c3", event_id: "pink-floyd", ticket_count: 1, total_amount: 500.00, status: "pending", created_at: new Date("2026-06-19T09:15:00").toISOString() },
  { id: "o4", customer_id: "c4", event_id: "pink-floyd", ticket_count: 4, total_amount: 2000.00, status: "paid", created_at: new Date("2026-06-19T11:00:00").toISOString() },
  { id: "o5", customer_id: "c5", event_id: "pink-floyd", ticket_count: 1, total_amount: 500.00, status: "cancelled", created_at: new Date("2026-06-19T12:00:00").toISOString() }
];

const INITIAL_TICKETS: Ticket[] = [
  { id: "t1", order_id: "o1", event_id: "pink-floyd", ticket_code: "PF-000001", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t2", order_id: "o1", event_id: "pink-floyd", ticket_code: "PF-000002", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t3", order_id: "o2", event_id: "pink-floyd", ticket_code: "PF-000012", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t4", order_id: "o2", event_id: "pink-floyd", ticket_code: "PF-000013", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t5", order_id: "o3", event_id: "pink-floyd", ticket_code: "PF-000014", status: "pending", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t6", order_id: "o4", event_id: "pink-floyd", ticket_code: "PF-000015", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t7", order_id: "o4", event_id: "pink-floyd", ticket_code: "PF-000016", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t8", order_id: "o4", event_id: "pink-floyd", ticket_code: "PF-000017", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t9", order_id: "o4", event_id: "pink-floyd", ticket_code: "PF-000018", status: "paid", checked_in_at: null, created_at: new Date().toISOString() },
  { id: "t10", order_id: "o5", event_id: "pink-floyd", ticket_code: "PF-000019", status: "cancelled", checked_in_at: null, created_at: new Date().toISOString() }
];

// Mock In-Memory Database for SSR/Build time and fallback
class MockDatabase {
  private events: Event[] = [SEED_EVENT];
  private customers: Customer[] = [...INITIAL_CUSTOMERS];
  private orders: Order[] = [...INITIAL_ORDERS];
  private tickets: Ticket[] = [...INITIAL_TICKETS];

  constructor() {
    this.loadFromStorage();
  }

  private isBrowser() {
    return typeof window !== "undefined";
  }

  private loadFromStorage() {
    if (!this.isBrowser()) return;
    try {
      const storedEvents = localStorage.getItem("fc_events");
      const storedCustomers = localStorage.getItem("fc_customers");
      const storedOrders = localStorage.getItem("fc_orders");
      const storedTickets = localStorage.getItem("fc_tickets");

      if (storedEvents) this.events = JSON.parse(storedEvents);
      if (storedCustomers) this.customers = JSON.parse(storedCustomers);
      if (storedOrders) this.orders = JSON.parse(storedOrders);
      if (storedTickets) this.tickets = JSON.parse(storedTickets);
    } catch (e) {
      console.error("Failed to load mock data from localStorage", e);
    }
  }

  private saveToStorage() {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem("fc_events", JSON.stringify(this.events));
      localStorage.setItem("fc_customers", JSON.stringify(this.customers));
      localStorage.setItem("fc_orders", JSON.stringify(this.orders));
      localStorage.setItem("fc_tickets", JSON.stringify(this.tickets));
    } catch (e) {
      console.error("Failed to save mock data to localStorage", e);
    }
  }

  public getEvents() { return this.events; }
  public getCustomers() { return this.customers; }
  public getOrders() { return this.orders; }
  public getTickets() { return this.tickets; }

  public addCustomer(customer: Customer) {
    this.customers.push(customer);
    this.saveToStorage();
  }

  public addOrder(order: Order) {
    this.orders.push(order);
    this.saveToStorage();
  }

  public addTickets(tickets: Ticket[]) {
    this.tickets.push(...tickets);
    this.saveToStorage();
  }

  public updateTicketStatus(ticketId: string, status: Ticket['status'], checkedInAt: string | null = null) {
    const idx = this.tickets.findIndex(t => t.id === ticketId);
    if (idx !== -1) {
      this.tickets[idx].status = status;
      if (checkedInAt !== undefined) {
        this.tickets[idx].checked_in_at = checkedInAt;
      }
      this.saveToStorage();
    }
  }
}

// Single instance for mock database
const db = new MockDatabase();

// Mock Supabase Query Builder
class MockSupabaseQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc = true;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*") {
    // Fluent interface chain
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderCol = column;
    this.orderAsc = ascending;
    return this;
  }

  async single() {
    const res = await this.execute();
    return { data: res.data ? res.data[0] || null : null, error: res.error };
  }

  private async execute() {
    let data: any[] = [];
    if (this.table === "events") data = db.getEvents();
    else if (this.table === "customers") data = db.getCustomers();
    else if (this.table === "orders") {
      data = db.getOrders().map(order => ({
        ...order,
        customer: db.getCustomers().find(c => c.id === order.customer_id)
      }));
    }
    else if (this.table === "tickets") {
      data = db.getTickets().map(ticket => {
        const order = db.getOrders().find(o => o.id === ticket.order_id);
        const customer = order ? db.getCustomers().find(c => c.id === order.customer_id) : undefined;
        return {
          ...ticket,
          order: order ? { ...order, customer } : undefined,
          customer // convenience join
        };
      });
    }

    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(filter);
    }

    // Apply ordering
    if (this.orderCol) {
      data.sort((a, b) => {
        const valA = a[this.orderCol!];
        const valB = b[this.orderCol!];
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    return { data, error: null };
  }

  // To support awaits directly on the query chain
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Mock Supabase Client
const mockSupabase = {
  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  },

  // Mock insertions
  async insert(table: string, data: any) {
    if (table === "customers") {
      db.addCustomer(data);
    } else if (table === "orders") {
      db.addOrder(data);
    } else if (table === "tickets") {
      if (Array.isArray(data)) {
        db.addTickets(data);
      } else {
        db.addTickets([data]);
      }
    }
    return { data, error: null };
  },

  // Mock updates
  async update(table: string, id: string, updates: any) {
    if (table === "tickets") {
      db.updateTicketStatus(id, updates.status, updates.checked_in_at);
    }
    return { data: updates, error: null };
  }
};

// Export active client
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (mockSupabase as any);

// Export seed event helper
export const getEvent = async (): Promise<Event> => {
  if (hasValidCredentials) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", "pink-floyd")
      .single();
    if (!error && data) return data as Event;
  }
  return SEED_EVENT;
};

