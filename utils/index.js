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

const dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new JSONFile(path.join(dirname, "../data/account.json"));

const db = new Low(adapter, { accounts: [] });



const createAccount = async () => {
  // start the spinner
  const spinner = ora("creating...").start();

  // read the account data from file
  await db.read();

  // get the available email domains
  const { data } = await axios.get("https://api.mail.tm/domains?page=1");

  // get the first domain
  const domain = data["hydra:member"][0].domain;

  // generate a random email address
  const email = `${Math.random().toString(36).substring(7)}@${domain}`;

  // generate a random password
  const password = Math.random().toString(36).substring(7);

  try {
    const { data } = await axios.post("https://api.mail.tm/accounts", {
      address: email,
      password,
    });

    // add password to the data object
    data.password = password;

    // copy the email to the clipboard
    await copy(email);

    // get Jwt token
    const { data: token } = await axios.post("https://api.mail.tm/token", {
      address: email,
      password,
    });

    // write token to a data object
    data.token = token;

    //write the data object to the account.json file
    db.data.accounts.push(data);
    await db.write();

    // stop the spinner
    spinner.stop();

    console.log(
      `${chalk.blue("Account created")}: ${chalk.underline.green(email)}`
    );
  } catch (error) {
    // stop the spinner
    spinner.stop();
    console.error(`${chalk.redBright("Error")}: ${error.message}`);
  }
};

const fetchMessages = async (account) => {

  // start the spinner
  const spinner = ora("fetching...").start();


  if (account === null) {
    // stop the spinner
    spinner.stop();

    console.log(`${chalk.redBright("Account not created yet")}`);

    return;
  }

  // get the messages
  const { data } = await axios.get("https://api.mail.tm/messages", {
    headers: {
      Authorization: `Bearer ${account.token.token}`,
    },
  });
  // get the emails
  const emails = data["hydra:member"];

  // stop the spinner
  spinner.stop();

  // if there are no emails, then there are no messages
  if (emails.length === 0) {
    console.log(`${chalk.redBright("No Emails")}`);
    return null;
  } else {
    return emails;
  }
};

const deleteAccount = async (account) => {


  // start the spinner
  const spinner = ora("deleting...").start();


  try {
    // if the account is null, then the account has not been created yet
    if (account === null) {
      // stop the spinner
      spinner.stop();

      console.log(`${chalk.redBright("Account not created yet")}`);
      return;
    }

    await axios.delete(`https://api.mail.tm/accounts/${account.id}`, {
      headers: {
        Authorization: `Bearer ${account.token.token}`,
      },
    });

    // delete the account from account.json file
    db.data.accounts.splice(accountIndex, 1);
    await db.write();


    // stop the spinner
    spinner.stop();

    console.log(`${chalk.blue("Account deleted")}`);
  } catch (error) {
    console.error(error.message);
    spinner.stop();
  }
};



// open specific email
const openEmail = async (email, mails, account) => {
  try {
    // start the spinner
    const spinner = ora("opening...").start();

    const mailToOpen = mails[email];

    // get email html content
    const { data } = await axios.get(
      `https://api.mail.tm/messages/${mailToOpen.id}`,
      {
        headers: {
          Authorization: `Bearer ${account.token.token}`,
        },
      }
    );

    // write the email html content to a file
    await fs.writeFile(path.join(dirname, "../data/email.html"), data.html[0]);

    // open the email html file in the browser
    await open(path.join(dirname, "../data/email.html"));

    // stop the spinner
    spinner.stop();
  } catch (error) {
    // stop the spinner
    spinner.stop();

    console.error(`${chalk.redBright("Error")}: ${error.message}`);
  }
};

// display the accounts
const accountSelector = async () => {

  await db.read();

  const accounts = db.data.accounts;
  
  // display accounts using inquirer
  const accountIndex =  await inquirer.prompt([
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
  if(accountIndex.account === -1) {
    console.log("Exiting...");
    process.exit(0);
  }
  return accounts[accountIndex.account];
  
};

const displayAccounts = async () => {
  await db.read();

  const accounts = db.data.accounts;

  if (accounts.length === 0) {
    console.log(`${chalk.redBright("No accounts created yet")}`);
    return;
  }

const inboxCounts = await Promise.all(accounts.map(account => getInboxCount(account)));

accounts.forEach((account, index) => {
  console.log(
    `${index + 1}. ${chalk.underline.blue(account.address)} (${chalk.green(inboxCounts[index])}) - ${chalk.yellow(
      "Created At"
    )}: ${new Date(account.createdAt).toLocaleString()}`
  );
});
}

const getInboxCount = async (account) => {
  const { data } = await axios.get("https://api.mail.tm/messages", {
    headers: {
      Authorization: `Bearer ${account.token.token}`,
    },
  });
  return data["hydra:totalItems"];
}




// export the functions using es6 syntax
const utils = {
  createAccount,
  fetchMessages,
  deleteAccount,
  openEmail,
  displayAccounts,
  accountSelector,

};

export default utils;
