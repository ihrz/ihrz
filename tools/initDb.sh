# Launch the Nix shell with PostgreSQL 16
nix-shell -p postgresql_16 --run "
  # Ask the user where the PostgreSQL database directory is located
  read -p \"Please specify the path to the PostgreSQL database directory: \" db_directory

  # Check if the directory exists
  if [ ! -d \"\$db_directory\" ]; then
    echo \"The specified directory does not exist. Please check the path.\"
    exit 1
  fi

  # Check if the postgresql.conf file exists in the directory
  if [ ! -f \"\$db_directory/postgresql.conf\" ]; then
    echo \"This is not a valid PostgreSQL database directory (postgresql.conf not found). \"
    exit 1
  fi

  # If everything is fine, continue with the creation steps
  echo \"Directory validated as a PostgreSQL database.\"

  # Create necessary subdirectories
  mkdir -p \"\$db_directory/pg_tblspc\" \
           \"\$db_directory/pg_wal\" \
           \"\$db_directory/pg_wal/archive_status\" \
           \"\$db_directory/pg_logical/snapshots\" \
           \"\$db_directory/pg_logical/mappings\" \
           \"\$db_directory/pg_snapshots\"

  # Start PostgreSQL with the specified database directory
  postgres -D \"\$db_directory\" -k /tmp
"
