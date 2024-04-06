# Mailsy Multi Email

![GitHub Repo stars](https://img.shields.io/github/stars/AmazingBongo811/Mailsy?color=ff&style=for-the-badge)

⚡️ Quickly generate a disposable email.

Fork of [Mailsy](https://github.com/BalliAsghar/Mailsy) by [BalliAsghar](https://github.com/BalliAsghar)

(Adds the ability to create multiple email addresses)



## Screenshots

![alt text](https://raw.githubusercontent.com/BalliAsghar/Mailsy/main/screenshot/Mailsy.png)



## Usage

**Creating Email**

Email will be copied to clipboard!

```console
foo@bar:~$ mailsy g
random@email.com
```

**Fetching Emails**

**Note:**

Hit Enter to open the email in your default browser.

```console
foo@bar:~$ mailsy m
? Select an email (Use arrow keys)
❯ 1. Hello, World! - from m.asghar99@outlook.com
  2. Mailsy - from m.asghar99@outlook.com

```

**Delete Account**

if you want to dispose a email and get the new one use:

```console
foo@bar:~$ mailsy d
Account deleted
```

**Acounnts Inbox**

```console
foo@bar:~$ mailsy a

 1. random@random.com (8) - Created At: 3/31/2024 8:33:48 PM

```

### FAQ

## How Mailsy works?

Mailsy is using [mail.tm](https://mail.tm/en/) API to generate a disposable email.


## License

[MIT](https://choosealicense.com/licenses/mit/)
