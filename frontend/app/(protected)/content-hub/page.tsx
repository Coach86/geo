"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentLibrary } from "./components/content-library";
import { GeneratedArticles } from "./components/generated-articles";

export default function ContentHubPage() {
  const [activeTab, setActiveTab] = useState("library");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Content Hub</h1>
        <p className="text-gray-600 mt-2">
          Manage your content library and generate AI-powered articles
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library">Content Library</TabsTrigger>
          <TabsTrigger value="articles">Generated Articles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="library" className="mt-6">
          <ContentLibrary />
        </TabsContent>
        
        <TabsContent value="articles" className="mt-6">
          <GeneratedArticles />
        </TabsContent>
      </Tabs>
    </div>
  );
}