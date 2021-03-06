DROP FUNCTION IF EXISTS format_date_short(timestamp with time zone,text);
CREATE OR REPLACE FUNCTION
    format_date_short (
        d timestamp with time zone,
        display_timezone text
    ) RETURNS text AS $$
BEGIN
    EXECUTE 'SET LOCAL timezone TO ' || quote_literal(display_timezone);
    RETURN to_char(d, 'HH24:MI, Dy, Mon FMDD');
END;
$$ LANGUAGE plpgsql VOLATILE;
