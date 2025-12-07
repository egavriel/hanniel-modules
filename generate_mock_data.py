import csv

data = [
    ["Item Name", "Price (IDR)"],
    ["Etoile one", "149000"],
    ["Etoile duo", "349000"],
    ["Etoile four", "599000"],
    ["Christmas Hamper", "850000"],
    ["Gingerbread House", "250000"]
]

with open("invoicing/master_data.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(data)

print("invoicing/master_data.csv created.")
