CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: client_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    label text NOT NULL,
    address text NOT NULL,
    city text,
    postal_code text,
    country text DEFAULT 'France'::text,
    latitude double precision,
    longitude double precision,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    siret text,
    address text,
    city text,
    postal_code text,
    country text DEFAULT 'France'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text,
    siret text,
    address text,
    city text,
    postal_code text,
    phone text,
    email text,
    logo_url text,
    quote_footer text,
    quote_conditions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    license_code text NOT NULL,
    email text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    activated_at timestamp with time zone,
    last_used_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    first_name text,
    last_name text,
    company_name text,
    siren text,
    address text,
    city text,
    postal_code text,
    company_status text,
    employee_count integer,
    plan_type text DEFAULT 'start'::text,
    max_drivers integer,
    max_clients integer,
    max_daily_charges integer,
    max_monthly_charges integer,
    max_yearly_charges integer,
    CONSTRAINT licenses_plan_type_check CHECK ((plan_type = ANY (ARRAY['start'::text, 'pro'::text, 'enterprise'::text])))
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    quote_number text NOT NULL,
    origin_address text NOT NULL,
    destination_address text NOT NULL,
    stops jsonb DEFAULT '[]'::jsonb,
    distance_km double precision NOT NULL,
    total_cost double precision NOT NULL,
    margin_percent double precision DEFAULT 20,
    price_ht double precision NOT NULL,
    tva_rate double precision DEFAULT 20,
    price_ttc double precision NOT NULL,
    valid_until date,
    notes text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    origin_address text NOT NULL,
    origin_lat double precision,
    origin_lng double precision,
    destination_address text NOT NULL,
    destination_lat double precision,
    destination_lng double precision,
    stops jsonb DEFAULT '[]'::jsonb,
    distance_km double precision NOT NULL,
    duration_minutes integer,
    toll_cost double precision DEFAULT 0,
    fuel_cost double precision DEFAULT 0,
    adblue_cost double precision DEFAULT 0,
    driver_cost double precision DEFAULT 0,
    structure_cost double precision DEFAULT 0,
    total_cost double precision NOT NULL,
    revenue double precision,
    profit double precision,
    profit_margin double precision,
    driver_ids uuid[] DEFAULT '{}'::uuid[],
    vehicle_data jsonb,
    trip_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trips_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: client_addresses client_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_addresses
    ADD CONSTRAINT client_addresses_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_user_id_key UNIQUE (user_id);


--
-- Name: licenses licenses_license_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_license_code_key UNIQUE (license_code);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: idx_licenses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_code ON public.licenses USING btree (license_code);


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_settings update_company_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotes update_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trips update_trips_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_addresses client_addresses_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_addresses
    ADD CONSTRAINT client_addresses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: trips trips_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: client_addresses Users can create addresses for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create addresses for their clients" ON public.client_addresses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = client_addresses.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: clients Users can create their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: company_settings Users can create their own company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own company settings" ON public.company_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: quotes Users can create their own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own quotes" ON public.quotes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trips Users can create their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trips" ON public.trips FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: client_addresses Users can delete addresses of their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete addresses of their clients" ON public.client_addresses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = client_addresses.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: clients Users can delete their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: quotes Users can delete their own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own quotes" ON public.quotes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trips Users can delete their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: client_addresses Users can update addresses of their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update addresses of their clients" ON public.client_addresses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = client_addresses.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: clients Users can update their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: company_settings Users can update their own company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own company settings" ON public.company_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: quotes Users can update their own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own quotes" ON public.quotes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trips Users can update their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: client_addresses Users can view addresses of their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view addresses of their clients" ON public.client_addresses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = client_addresses.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: clients Users can view their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: company_settings Users can view their own company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own company settings" ON public.company_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quotes Users can view their own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trips Users can view their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: client_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: licenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;