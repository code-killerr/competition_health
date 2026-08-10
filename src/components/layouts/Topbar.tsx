import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-secondary" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <button type="button" onClick={() => navigate('/workspace/dashboard')} className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary font-mono-data text-sm font-bold text-primary-foreground">
          S
        </span>
        <div className="hidden min-w-0 sm:block">
          <strong className="block text-sm leading-tight text-foreground">SeekSpace</strong>
          <span className="block font-mono-data text-[10px] leading-tight text-muted-foreground">Spatial ATAC · Transcriptome</span>
        </div>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => toast.info('系统设置功能开发中')} className="text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 text-foreground hover:bg-secondary">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-4 w-4" />
              </span>
              <span className="hidden text-sm sm:inline">研究员</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>个人设置</DropdownMenuItem>
            <DropdownMenuItem>系统偏好</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground">关于 SeekSpace</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Topbar;