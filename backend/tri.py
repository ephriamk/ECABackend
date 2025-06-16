import pandas as pd
import re
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

file_path = 'attrition.xlsx'
df = pd.read_excel(file_path, sheet_name=0, engine='openpyxl', header=None)

# Print all rows that contain 'total' or 'collected' in any cell
for idx, row in df.iterrows():
    if any(isinstance(cell, str) and (re.search(r'total', cell, re.IGNORECASE) or re.search(r'collected', cell, re.IGNORECASE)) for cell in row):
        print(f"Row {idx}: {row.values}")

# Optionally, print the whole DataFrame to see the structure
# print(df)

def match_total_collected(cell):
    if not isinstance(cell, str):
        return False
    # Ignore asterisks and match 'total collected' anywhere in the string
    return re.search(r'total\\s*collected', cell.replace('*', ''), re.IGNORECASE) is not None

row_idx = None
for idx, row in df.iterrows():
    if any(match_total_collected(cell) for cell in row):
        row_idx = idx
        break

if row_idx is not None:
    row = df.iloc[row_idx]
    # Get all values in the row that look like currency or numbers, excluding the label cell
    values = [v for v in row if (isinstance(v, str) and re.search(r'\\$?\\d', v)) or isinstance(v, (int, float))]
    total_value = values[0] if values else None
else:
    total_value = None

print("Total Collected value found:", total_value)

# 1. Load the sheet and convert to string
file_path = 'attrition.xlsx'
df = pd.read_excel(file_path, sheet_name=0, engine='openpyxl', header=None)
table_str = df.to_csv(index=False, header=False)

# 2. Set up LangChain with Ollama (make sure Ollama is running locally)
llm = Ollama(model="llama3")  # or another model you have downloaded

prompt = PromptTemplate(
    input_variables=["table"],
    template=(
        "Given the following table data (as CSV), what is the value for the row labeled '** TOTAL COLLECTED'? "
        "If you find a row with that label (or similar), return the value(s) in that row. "
        "Table:\n{table}\n\nAnswer:"
    ),
)

chain = LLMChain(llm=llm, prompt=prompt)

# 3. Run the chain
response = chain.run(table=table_str)
print("LLM extracted value:", response)