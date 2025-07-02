'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface FilterBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterScore: string;
  setFilterScore: (value: string) => void;
  filterDimension: string;
  setFilterDimension: (value: string) => void;
  filterSeverity: string;
  setFilterSeverity: (value: string) => void;
  filterCategory?: string;
  setFilterCategory?: (value: string) => void;
}

export function FilterBar({
  searchTerm,
  setSearchTerm,
  filterScore,
  setFilterScore,
  filterDimension,
  setFilterDimension,
  filterSeverity,
  setFilterSeverity,
  filterCategory,
  setFilterCategory,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by URL or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <Select value={filterScore} onValueChange={setFilterScore}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Score Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Scores</SelectItem>
          <SelectItem value="high">High (80+)</SelectItem>
          <SelectItem value="medium">Medium (60-79)</SelectItem>
          <SelectItem value="low">Low ({"<"}60)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterDimension} onValueChange={setFilterDimension}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Dimension" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dimensions</SelectItem>
          <SelectItem value="authority">Authority</SelectItem>
          <SelectItem value="freshness">Freshness</SelectItem>
          <SelectItem value="structure">Structure</SelectItem>
          <SelectItem value="brand">Brand</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {filterCategory !== undefined && setFilterCategory && (
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Page Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="homepage">Homepage</SelectItem>
            <SelectItem value="product_service">Product/Service</SelectItem>
            <SelectItem value="blog_article">Blog/Article</SelectItem>
            <SelectItem value="documentation_help">Documentation/Help</SelectItem>
            <SelectItem value="about_company">About/Company</SelectItem>
            <SelectItem value="faq">FAQ</SelectItem>
            <SelectItem value="case_study">Case Study</SelectItem>
            <SelectItem value="pricing">Pricing</SelectItem>
            <SelectItem value="landing_campaign">Landing/Campaign</SelectItem>
            <SelectItem value="navigation_category">Navigation/Category</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}