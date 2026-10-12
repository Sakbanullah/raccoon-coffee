"use client";

import * as React from "react";
import { UploadCloud, X, CheckCircle2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface FileUploadCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd"> {
  files: UploadedFile[];
  onFilesChange: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onClose?: () => void;
  accept?: string;
  multiple?: boolean;
  hint?: string;
}

export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(
  ({ className, files = [], onFilesChange, onFileRemove, onClose, accept = "image/jpeg,image/png,image/gif", multiple = false, hint = "JPG, PNG, atau GIF · maks 5 MB", ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles && droppedFiles.length > 0) {
        onFilesChange(multiple ? droppedFiles : [droppedFiles[0]]);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        onFilesChange(multiple ? selectedFiles : [selectedFiles[0]]);
      }
      if (e.target) e.target.value = "";
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    
    const cardVariants = {
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0 },
    };
    
    const fileItemVariants = {
      hidden: { opacity: 0, x: -10 },
      visible: { opacity: 1, x: 0 },
    };

    return (
      // @ts-ignore
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.25 }}
        className={cn(
          "w-full bg-card rounded-[8px] border border-input shadow-sm",
          className
        )}
        {...props}
      >
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={cn(
            "border-2 border-dashed rounded-[6px] p-6 flex flex-col items-center justify-center text-center transition-colors duration-200 cursor-pointer",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-input hover:border-primary/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={accept}
            className="hidden"
            onChange={handleFileSelect}
          />
          <UploadCloud className="w-8 h-8 text-primary/70 mb-3" />
          <p className="font-medium text-sm text-foreground">Pilih foto atau seret ke sini</p>
          <p className="text-xs text-muted-foreground mt-1">
            {hint}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3 pointer-events-none text-xs h-8 px-3">
            Cari Berkas
          </Button>
        </div>
        
        {files.length > 0 && (
          <div className="p-4 border-t border-input">
            <ul className="space-y-3">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.li
                    key={file.id}
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded bg-muted font-bold text-[10px] text-muted-foreground">
                        {file.file.type.split("/")[1]?.toUpperCase().substring(0, 3) || "IMG"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{file.file.name}</p>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{formatFileSize(file.file.size)}</span>
                          <span>•</span>
                          <span className="text-primary font-medium">Siap diunggah</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="rounded-full w-7 h-7" onClick={(e) => { e.stopPropagation(); onFileRemove(file.id); }}>
                         <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </motion.div>
    );
  }
);
FileUploadCard.displayName = "FileUploadCard";