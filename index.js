#!/usr/bin/env node
import { Command } from "commander";
import utils from "./utils/index.js";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs";

const program = new Command();

const version = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url))
).version;

program
  .name("Mailsy")
  .version(version, "-v, --version", "Output the current version")
  .description(
    "⚡️ Quickly generate a disposable email straight from terminal."
  );
  
// Generate a new email
program
  .command("g")
  .description("Generate a new email account")
  .action(() => utils.createAccount());

  program.command("a").description("display all email accounts").action(async () => {utils.displayAccounts()});

// fetch messages from the inbox
program
  .command("m")
  .description("Fetch messages from the inbox")
  .action(async () => {
    try {
      const account = await utils.accountSelector();
      const emails = await utils.fetchMessages(account);

      if (!emails) return;

      // show the emails using inquirer
      const { email } = await inquirer.prompt([
        {
          type: "list",
          name: "email",
          message: "Select an email",
          choices: [...emails.map((email, index) => ({
            name: `${index + 1}. ${chalk.underline.blue(
              email.subject
            )} - ${chalk.yellow("From:")}  ${email.from.address}`,
            value: index ,
          })), {name: "Exit", value: -1}],
        },
      ]);

      if(email === -1) {
        console.log("Exiting...");
        process.exit(0);
      }

      // open the email
      await utils.openEmail(email, emails, account );
    } catch (error) {
      console.error(error.message);
    }
  });

// delete account
program
  .command("d")
  .description("Delete account")
  .action(() => {
    const account = utils.accountSelector();
    utils.deleteAccount(account);
  });
 

program.parse();
