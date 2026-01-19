-- Create a function to get table columns from information_schema
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = get_table_columns.table_name
  ORDER BY c.ordinal_position;
$$;