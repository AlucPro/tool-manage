# Schema Notes

This directory is the documentation source for the sqlite schema used by `tool-manage`.

## Files

- `sqlite.sql`: target table structure for the current application version

## How it relates to runtime code

The application still creates and migrates tables from `src/data/sqlite.js`.

Use this directory to:

- understand the intended table structure
- review new columns before changing runtime migrations
- keep database documentation close to the repo

## V2 changes

The main V2 storage change is `commands.deleted_at`, which enables soft deletion.

Application behavior tied to this field:

- active command queries filter with `deleted_at IS NULL`
- remove marks `deleted_at` instead of deleting the row
- re-adding the same command clears `deleted_at` and restores the record
