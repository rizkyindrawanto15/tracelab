"use client";

import * as React from "react";
import { FolderPlus } from "lucide-react";
import { useCollections, useCollectionMutations, useRequestMutations, useWorkspaceId } from "@/lib/data/hooks";
import { type RequestConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-tabs";
import { toast } from "sonner";

interface SaveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: RequestConfig;
  defaultName?: string;
  defaultCollectionId?: string;
  onSaved?: (req: { id: string; name: string; collection_id: string; config: RequestConfig }) => void;
}

export function SaveRequestModal({
  open,
  onOpenChange,
  config,
  defaultName = "Untitled Request",
  defaultCollectionId,
  onSaved,
}: SaveRequestModalProps) {
  const ws = useWorkspaceId();
  const { data: collections = [] } = useCollections(ws);
  const collectionMutations = useCollectionMutations(ws);
  const requestMutations = useRequestMutations(ws);

  const [name, setName] = React.useState(defaultName);
  const [collectionId, setCollectionId] = React.useState(defaultCollectionId || "");
  const [description, setDescription] = React.useState("");
  const [creatingCol, setCreatingCol] = React.useState(false);
  const [newColName, setNewColName] = React.useState("");

  // Sync default name when opened
  React.useEffect(() => {
    if (open) {
      setName(defaultName || "Untitled Request");
      if (defaultCollectionId) {
        setCollectionId(defaultCollectionId);
      } else if (collections.length > 0 && !collectionId) {
        setCollectionId(collections[0].id);
      }
    }
  }, [open, defaultName, defaultCollectionId, collections]);

  const handleCreateCollection = async () => {
    if (!newColName.trim()) return;
    try {
      const col = await collectionMutations.create.mutateAsync({ name: newColName.trim() });
      setCollectionId(col.id);
      setCreatingCol(false);
      setNewColName("");
    } catch {
      // Handled in mutation hook
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a request name");
      return;
    }
    if (!collectionId) {
      toast.error("Please select a collection");
      return;
    }

    try {
      const saved = await requestMutations.create.mutateAsync({
        collection_id: collectionId,
        name: name.trim(),
        description: description.trim(),
        config,
      });
      toast.success(`Request "${saved.name}" saved to collection`);
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Save Request</DialogTitle>
            <DialogDescription className="text-xs">
              Save this request into a collection for easy reuse and workspace sharing.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="req-name">Request Name</Label>
              <Input
                id="req-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Get User Profile"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="col-select">Collection</Label>
                <button
                  type="button"
                  onClick={() => setCreatingCol(!creatingCol)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <FolderPlus className="size-3" />
                  {creatingCol ? "Choose existing" : "New collection"}
                </button>
              </div>

              {creatingCol ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="New collection name"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCreateCollection}
                    loading={collectionMutations.create.isPending}
                  >
                    Create
                  </Button>
                </div>
              ) : (
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger id="col-select">
                    <SelectValue placeholder="Select a collection…" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-desc">Description (Optional)</Label>
              <Textarea
                id="req-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or API documentation details for teammates…"
                className="min-h-[64px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={requestMutations.create.isPending}>
              Save to Collection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
