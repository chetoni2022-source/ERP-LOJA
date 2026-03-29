-- =====================================================
-- MIGRAÇÃO FASE 18 — Catálogos com Tema e Descrição
-- Execute no Supabase SQL Editor
-- =====================================================

-- Adicionar colunas de personalização à tabela de catálogos
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'luxury';
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS description TEXT;
