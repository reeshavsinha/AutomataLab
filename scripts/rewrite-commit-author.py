#!/usr/bin/env python3
"""Amend HEAD during rebase --exec: set author to repo owner and drop Cursor co-author trailer."""
import subprocess
import sys

AUTHOR = "reeshavsinha <146538653+reeshavsinha@users.noreply.github.com>"


def main() -> None:
    msg = subprocess.check_output(["git", "log", "-1", "--pretty=%B"], text=True)
    lines = [
        line
        for line in msg.splitlines()
        if not line.strip().startswith("Co-authored-by: Cursor")
    ]
    new_msg = "\n".join(lines).strip() + "\n"
    subprocess.run(
        ["git", "commit", "--amend", f"--author={AUTHOR}", "-F", "-"],
        input=new_msg,
        text=True,
        check=True,
    )


if __name__ == "__main__":
    main()
