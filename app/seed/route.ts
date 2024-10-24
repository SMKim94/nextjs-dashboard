import bcrypt from 'bcrypt';
import { PoolConnection } from 'mysql2/promise';
import pool from '../lib/database/mysql/conn';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

async function seedUsers(connection: PoolConnection) {
  await connection.query(`
    DROP TABLE IF EXISTS users;
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) DEFAULT UUID() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

  const insertedUsers = await Promise.all(
    users.map(async user => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return connection.query(`
        INSERT INTO users (id, name, email, password)
        VALUES ('${user.id}', '${user.name}', '${user.email}', '${hashedPassword}');
      `);
    }),
  );

  return insertedUsers;
}

async function seedInvoices(connection: PoolConnection) {
  await connection.query(`
    DROP TABLE IF EXISTS invoices;
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id CHAR(36) DEFAULT UUID() PRIMARY KEY,
      customer_id CHAR(36) NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);

  const insertedInvoices = await Promise.all(
    invoices.map(
      invoice => connection.query(`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES ('${invoice.customer_id}', ${invoice.amount}, '${invoice.status}', '${invoice.date}');
      `),
    )
  );

  return insertedInvoices;
}

async function seedCustomers(connection: PoolConnection) {
  await connection.query(`
    DROP TABLE IF EXISTS customers;
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id CHAR(36) DEFAULT UUID() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  const insertedCustomers = await Promise.all(
    customers.map(
      customer => connection.query(`
        INSERT INTO customers (id, name, email, image_url)
        VALUES ('${customer.id}', '${customer.name}', '${customer.email}', '${customer.image_url}');
      `),
    ),
  );

  return insertedCustomers;
}

async function seedRevenue(connection: PoolConnection) {
  await connection.query(`
    DROP TABLE IF EXISTS revenue;
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `);

  const insertedRevenue = await Promise.all(
    revenue.map(
      rev => connection.query(`
        INSERT INTO revenue (month, revenue)
        VALUES ('${rev.month}', '${rev.revenue}')
      `),
    )
  );

  return insertedRevenue;
}

export async function GET() {
  let connection: PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await seedUsers(connection);
    await seedCustomers(connection);
    await seedInvoices(connection);
    await seedRevenue(connection);
    await connection.commit();

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return Response.json({ 
      message: 'Database seeded failed',
      error,
    }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
