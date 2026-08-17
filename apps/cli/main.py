def main():
    for data in get_data():
        try:
            process_data(data)
        except Exception as e:
            print(f"Error: {e}")
            exit(1)

    print("Process completed successfully.")
