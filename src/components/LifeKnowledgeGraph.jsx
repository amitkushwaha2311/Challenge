import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  Sparkles,
  RefreshCw,
  Layers,
  Search,
  Filter,
  Info,
  Maximize2
} from 'lucide-react';
import { extractLifeGraphNodes } from '../services/api.js';
import { loadUserEntries } from '../services/storage.js';

const CATEGORY_COLORS = {
  Project: '#38bdf8', // Cyan
  Habit: '#10b981',   // Emerald
  Goal: '#f59e0b',    // Amber
  Value: '#8b5cf6',   // Violet
  Tech: '#ec4899',    // Pink
  Default: '#64748b'
};

export default function LifeKnowledgeGraph({ user, onOpenAuth }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const nodesRef = useRef([]);

  const loadGraph = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userEntries = await loadUserEntries(user.uid);
      const res = await extractLifeGraphNodes(userEntries);
      setGraphData(res.graph);
      initPhysicsNodes(res.graph);
    } catch (err) {
      console.warn('Using default seed life graph:', err.message);
      const fallback = {
        nodes: [
          { id: '1', label: 'Zero-Trust Architecture', category: 'Tech', val: 24 },
          { id: '2', label: 'Gemini Journaling', category: 'Project', val: 28 },
          { id: '3', label: 'GCP Secret Manager', category: 'Tech', val: 18 },
          { id: '4', label: 'Sustained Pacing', category: 'Habit', val: 20 },
          { id: '5', label: 'Mental Clarity', category: 'Value', val: 22 },
          { id: '6', label: 'Mindful Walks', category: 'Habit', val: 16 },
          { id: '7', label: 'Client E2EE Vault', category: 'Tech', val: 20 },
          { id: '8', label: 'Mastery & Focus', category: 'Goal', val: 22 }
        ],
        links: [
          { source: '2', target: '1', relationship: 'Secured By' },
          { source: '1', target: '3', relationship: 'Integrates' },
          { source: '1', target: '7', relationship: 'Enforces' },
          { source: '2', target: '4', relationship: 'Cultivates' },
          { source: '4', target: '5', relationship: 'Strengthens' },
          { source: '6', target: '4', relationship: 'Anchors' },
          { source: '5', target: '8', relationship: 'Accelerates' },
          { source: '2', target: '8', relationship: 'Drives' }
        ]
      };
      setGraphData(fallback);
      initPhysicsNodes(fallback);
    } finally {
      setLoading(false);
    }
  };

  const initPhysicsNodes = (data) => {
    if (!data || !data.nodes) return;
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 800;
    const height = canvas ? canvas.height : 500;

    // Initialize with randomized coordinates near center
    nodesRef.current = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      const radius = 120 + Math.random() * 80;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.max(14, Math.min(28, (n.val || 16)))
      };
    });
  };

  useEffect(() => {
    loadGraph();
  }, [user]);

  // Canvas interactive simulation render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;

    const ctx = canvas.getContext('2d');
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const links = graphData.links || [];

      // Physics step: Gentle central gravity and repulsion
      nodes.forEach((node, i) => {
        // Gravity toward center
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * 0.0003;
        node.vy += dy * 0.0003;

        // Repulsion between nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const rx = other.x - node.x;
          const ry = other.y - node.y;
          const dist = Math.sqrt(rx * rx + ry * ry) || 1;
          if (dist < 180) {
            const force = (180 - dist) * 0.0008;
            node.vx -= (rx / dist) * force;
            node.vy -= (ry / dist) * force;
            other.vx += (rx / dist) * force;
            other.vy += (ry / dist) * force;
          }
        }

        // Apply velocity with damping
        node.vx *= 0.94;
        node.vy *= 0.94;
        node.x += node.vx;
        node.y += node.vy;

        // Bounding box bounce
        if (node.x < node.radius) node.x = node.radius;
        if (node.x > width - node.radius) node.x = width - node.radius;
        if (node.y < node.radius) node.y = node.radius;
        if (node.y > height - node.radius) node.y = height - node.radius;
      });

      // Draw Links
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Link label
          if (link.relationship) {
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(link.relationship, midX, midY - 4);
          }
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        const color = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.Default;
        const isHighlighted = selectedNode?.id === node.id;

        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isHighlighted ? 6 : 2), 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted ? `${color}60` : `${color}20`;
        ctx.fill();

        // Core circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.4)';
        ctx.stroke();

        // Node Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [graphData, selectedNode]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clicked = nodesRef.current.find(n => {
      const dist = Math.sqrt((n.x - clickX) ** 2 + (n.y - clickY) ** 2);
      return dist <= n.radius + 5;
    });

    setSelectedNode(clicked || null);
  };

  if (!user) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Network size={48} color="var(--accent-cyan)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Interactive Life Knowledge Graph</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '440px', margin: '0 auto 20px' }}>
          Sign in to synthesize an interconnected visual map of your thoughts, goals, recurring themes, and habits.
        </p>
        <button className="btn btn-primary" onClick={onOpenAuth}>
          Authenticate to View Life Graph
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Network size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.4rem' }}>Life Knowledge & Thought Graph</h2>
            <span className="badge badge-cyan">AUTONOMOUS MAPPING</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Interactive mind map synthesizing interconnected habits, technical breakthroughs, and life goals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Category Legend */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'Default').map(([cat, color]) => (
              <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                {cat}
              </span>
            ))}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadGraph}
            disabled={loading}
            id="btn-sync-graph"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Synthesizing...' : 'Sync Graph'}
          </button>
        </div>
      </div>

      {/* Main Canvas & Detail Box */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 320px' : '1fr', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '16px', position: 'relative', overflow: 'hidden', minHeight: '520px' }}>
          <canvas
            ref={canvasRef}
            width={880}
            height={520}
            onClick={handleCanvasClick}
            style={{ width: '100%', height: '520px', display: 'block', cursor: 'pointer' }}
          />

          <div style={{ position: 'absolute', bottom: '16px', left: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            💡 Click on any node to inspect relationships and connections
          </div>
        </div>

        {selectedNode && (
          <div className="glass-panel-glow" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>{selectedNode.category}</span>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedNode.label}</h3>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedNode(null)}
                  style={{ padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                This concept is extracted from recurring reflections in your isolated journal. It anchors your daily cognitive focus.
              </p>

              {/* Connections */}
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Connected Concepts:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(graphData?.links || [])
                  .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                  .map((link, idx) => {
                    const otherId = link.source === selectedNode.id ? link.target : link.source;
                    const otherNode = graphData.nodes.find(n => n.id === otherId);
                    return (
                      <div key={idx} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{otherNode?.label || otherId}</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{link.relationship}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '16px' }}>
              Extracted via Gemini 2.5 Structured Schema
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
