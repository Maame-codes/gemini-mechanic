# Contributing to Gemini-Mechanic

Thank you for considering contributing to Gemini-Mechanic! It's people like you that make this tool better for the developer community.

---

## 🤝 How Can I Contribute?

### 🐛 Reporting Bugs

- Check the [Issues](../../issues) tab to see if the bug has already been reported.
- If not, open a new issue.
- Include steps to reproduce the bug, the expected behaviour, and your Python version.

### 💡 Suggesting Enhancements

- Open an issue to discuss the enhancement before starting work on it.
- We specifically welcome new "Mechanic" prompts or system analysis logic.

---

## 💻 Local Development Setup

1. **Fork and Clone** — Fork this repository and clone it to your local machine.

2. **Virtual Environment** — Use a virtual environment to keep your dependencies isolated:
```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Dependencies:**
```bash
   pip install -r requirements.txt
```

4. **Environment Variables:**
   - Create a `.env` file in the root directory.
   - Add your `GEMINI_API_KEY`.
   - ⚠️ **Security Note:** Never commit your `.env` file to version control.

---

## 🚀 Pull Request Process

1. **Branching** — Create a new branch for your specific feature or fix.
2. **Standards** — Ensure your code follows [PEP 8](https://peps.python.org/pep-0008/) standards for Python.
3. **Documentation** — Update the `README.md` if your changes include new functionality.
4. **Submission** — Submit your PR with a clear, concise description of the changes and the problem they solve.
