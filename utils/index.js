import axios from "axios";
import fs from "fs/promises";
import copy from "./copy.js";
import { Low } from "lowdb";
import { JSONFile } from 'lowdb/node';
import ora from "ora";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import open from "open";
import { Console } from "console";
import inquirer from "inquirer";

// Importing necessary modules

// Getting the directory name
const dirname = path.dirname(fileURLToPath(import.meta.url));

// Setting up the database
const adapter = new JSONFile(path.join(dirname, "../data/account.json"));
const db = new Low(adapter, { accounts: [] });

// Setting up the messages count database
const messagesCountDb = new Low(new JSONFile(path.join(dirname, "../data/localInboxCount.json")), { messagesCount: [] });

// Function to write inbox count to local
const writeInboxCountToLocal = async (accounts, messageCounts) => {
  await messagesCountDb.read();
  messagesCountDb.data.messagesCount = accounts.map((account, index) => ({
    address: account.address,
    count: messageCounts[index],
  }));
  await messagesCountDb.write();
}

// Function to get local inbox count
const getLocalInboxCount = async (account) => {
  await messagesCountDb.read();
  const messageCount = messagesCountDb.data.messagesCount.find((messageCount) => messageCount.address === account.address);
  return messageCount ? messageCount.count : 0;
}

// Function to create account
const createAccount = async () => {
  // Start the spinner
  const spinner = ora("creating...").start();

  // Read the account data from file
  await db.read();

  // Get the available email domains
  const { data } = await axios.get("https://api.mail.tm/domains?page=1");

  // Get the first domain
  const domain = data["hydra:member"][0].domain;

  // Generate a random email address
  const email = `${Math.random().toString(36).substring(7)}@${domain}`;

  // Generate a random password
  const password = Math.random().toString(36).substring(7);

  try {
    // Create account
    const { data } = await axios.post("https://api.mail.tm/accounts", {
      address: email,
      password,
    });

    // Add password to the data object
    data.password = password;

    // Copy the email to the clipboard
    await copy(email);

    // Get Jwt token
    const { data: token } = await axios.post("https://api.mail.tm/token", {
      address: email,
      password,
    });

    // Write token to a data object
    data.token = token;

    // Write the data object to the account.json file
    db.data.accounts.push(data);
    await db.write();

    // Stop the spinner
    spinner.stop();

    console.log(
      `${chalk.blue("Account created")}: ${chalk.underline.green(email)}`
    );
  } catch (error) {
    // Stop the spinner
    spinner.stop();
    console.error(`${chalk.redBright("Error")}: ${error.message}`);
  }
};

// Function to fetch messages
const fetchMessages = async (account) => {

  // Start the spinner
  const spinner = ora("fetching...").start();

  if (account === null) {
    // Stop the spinner
    spinner.stop();

    console.log(`${chalk.redBright("Account not created yet")}`);

    return;
  }

  // Get the messages
  const { data } = await axios.get("https://api.mail.tm/messages", {
    headers: {
      Authorization: `Bearer ${account.token.token}`,
    },
  });
  // Get the emails
  const emails = data["hydra:member"];

  // Stop the spinner
  spinner.stop();

  // If there are no emails, then there are no messages
  if (emails.length === 0) {
    console.log(`${chalk.redBright("No Emails")}`);
    return null;
  } else {
    return emails;
  }
};

// Function to delete account
const deleteAccount = async (account) => {

  // Start the spinner
  const spinner = ora("deleting...").start();

  await db.read();

  try {
    // If the account is null, then the account has not been created yet
    if (account === null) {
      // Stop the spinner
      spinner.stop();

      console.log(`${chalk.redBright("Account not created yet")}`);
      return;
    }

    // Delete the account
    await axios.delete(`https://api.mail.tm/accounts/${account.id}`, {
      headers: {
        Authorization: `Bearer ${account.token.token}`,
      },
    });

    // Delete the account from account.json file
    db.data.accounts = db.data.accounts.filter(
      (acc) => acc.id !== account.id
    );
    await db.write();

    // Stop the spinner
    spinner.stop();

    console.log(`${chalk.blue("Account deleted")}`);
  } catch (error) {
    console.error(error.message);
    spinner.stop();
  }
};

// Function to open specific email
const openEmail = async (email, mails, account) => {
  try {
    // Start the spinner
    const spinner = ora("opening...").start();

    const mailToOpen = mails[email];

    // Get email html content
    const { data } = await axios.get(
      `https://api.mail.tm/messages/${mailToOpen.id}`,
      {
        headers: {
          Authorization: `Bearer ${account.token.token}`,
        },
      }
    );

    // Write the email html content to a file
    await fs.writeFile(path.join(dirname, "../data/email.html"), data.html[0]);

    // Open the email html file in the browser
    await open(path.join(dirname, "../data/email.html"));

    // Stop the spinner
    spinner.stop();
  } catch (error) {
    // Stop the spinner
    spinner.stop();

    console.error(`${chalk.redBright("Error")}: ${error.message}`);
  }
};

// Function to select account
const accountSelector = async () => {

  await db.read();

  const accounts = db.data.accounts;

  // Display accounts using inquirer
  const accountIndex = await inquirer.prompt([
    {
      type: "list",
      name: "account",
      message: "Select an account",
      choices: [
        ...accounts.map((account, index) => ({
          name: `${index + 1}. ${chalk.underline.blue(
            account.address
          )}`,
          value: index,
        })),
        {
          name: "Exit",
          value: -1
        }
      ],
    },
  ]);
  if (accountIndex.account === -1) {
    console.log("Exiting...");
    process.exit(0);
  }
  return accounts[accountIndex.account];

};

// Function to display accounts
const displayAccounts = async () => {
  await db.read();

  const accounts = db.data.accounts;

  if (accounts.length === 0) {
    console.log(`${chalk.redBright("No accounts created yet")}`);
    return;
  }

  const inboxCounts = await Promise.all(accounts.map(account => getInboxCount(account)));

  const localInboxCount = await Promise.all(accounts.map(account => getLocalInboxCount(account)));

  accounts.forEach((account, index) => {
    console.log(
      `${index + 1}. ${chalk.underline.blue(account.address)} (${inboxCounts[index] > localInboxCount[index] ? chalk.green(inboxCounts[index]) : chalk.white(inboxCounts[index])}) - ${chalk.yellow(
        "Created At"
      )}: ${new Date(account.createdAt).toLocaleString()}`
    );
  });

  writeInboxCountToLocal(accounts, inboxCounts);
}

// Function to get inbox count
const getInboxCount = async (account) => {
  const { data } = await axios.get("https://api.mail.tm/messages", {
    headers: {
      Authorization: `Bearer ${account.token.token}`,
    },
  });
  return data["hydra:totalItems"];
}

// Export the functions using es6 syntax
const utils = {
  createAccount,
  fetchMessages,
  deleteAccount,
  openEmail,
  displayAccounts,
  accountSelector,
};

export default utils;
