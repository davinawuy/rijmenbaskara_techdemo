import os
import sys
import django
from pathlib import Path
from datetime import datetime
import json

# Setup Django
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rijmenbaskara.settings')
django.setup()

from django.conf import settings

# Article storage directory
ARTICLES_DIR = Path(settings.BASE_DIR) / "articles_store"
ARTICLES_DIR.mkdir(exist_ok=True)

# Sample articles
SAMPLE_ARTICLES = [
    {
        "title": "Getting Started with Django",
        "subtitle": "A comprehensive guide to building web applications with Django",
        "body_html": """
        <h2>Introduction</h2>
        <p>Django is a high-level Python web framework that encourages rapid development and clean, pragmatic design. Built by experienced developers, it takes care of much of the hassle of web development, so you can focus on writing your app without needing to reinvent the wheel.</p>
        
        <h2>Key Features</h2>
        <ul>
            <li><strong>Fast Development:</strong> Django was designed to help developers take applications from concept to completion as quickly as possible.</li>
            <li><strong>Secure:</strong> Django takes security seriously and helps developers avoid many common security mistakes.</li>
            <li><strong>Scalable:</strong> Some of the busiest sites on the web leverage Django's ability to quickly and flexibly scale.</li>
        </ul>
        
        <h2>Getting Started</h2>
        <p>To get started with Django, you'll need to have Python installed on your system. Then, you can install Django using pip:</p>
        <pre><code>pip install django</code></pre>
        
        <h2>Creating Your First Project</h2>
        <p>Once Django is installed, you can create a new project using the django-admin command:</p>
        <pre><code>django-admin startproject myproject</code></pre>
        
        <h2>Conclusion</h2>
        <p>Django is an excellent choice for web development, offering a robust framework with excellent documentation and a vibrant community. Happy coding!</p>
        """,
        "tags": ["Tech", "Web Development", "Python"],
    },
    {
        "title": "The Art of Clean Code",
        "subtitle": "Best practices for writing maintainable and readable code",
        "body_html": """
        <h2>Why Clean Code Matters</h2>
        <p>Clean code is code that is easy to understand, easy to change, and easy to maintain. It's not just about making code work; it's about making code that others (and your future self) can work with.</p>
        
        <h2>Principles of Clean Code</h2>
        <h3>1. Meaningful Names</h3>
        <p>Use descriptive and meaningful names for variables, functions, and classes. A good name should reveal intent and make the code self-documenting.</p>
        
        <h3>2. Small Functions</h3>
        <p>Functions should do one thing and do it well. If a function is doing too much, break it down into smaller, more focused functions.</p>
        
        <h3>3. Don't Repeat Yourself (DRY)</h3>
        <p>Avoid duplication of code. If you find yourself copying and pasting code, it's time to refactor.</p>
        
        <h2>Code Comments</h2>
        <p>Good code should be self-explanatory. Comments should explain <em>why</em>, not <em>what</em>. If you need to explain what the code does, consider refactoring it to be clearer.</p>
        
        <h2>Testing</h2>
        <p>Clean code includes tests. Tests document how the code should be used and ensure it continues to work as expected.</p>
        """,
        "tags": ["Tech", "Best Practices", "Programming"],
    },
    {
        "title": "Modern CSS Techniques",
        "subtitle": "Exploring CSS Grid, Flexbox, and custom properties",
        "body_html": """
        <h2>The Evolution of CSS</h2>
        <p>CSS has come a long way from simple styling to a powerful layout system. Modern CSS features make it easier than ever to create responsive, beautiful designs.</p>
        
        <h2>CSS Grid</h2>
        <p>CSS Grid is a two-dimensional layout system that allows you to create complex layouts with ease. Unlike Flexbox, which is one-dimensional, Grid lets you work with both rows and columns simultaneously.</p>
        <pre><code>.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}</code></pre>
        
        <h2>Flexbox</h2>
        <p>Flexbox is perfect for one-dimensional layouts. It excels at distributing space and aligning items in a container, even when their size is unknown or dynamic.</p>
        <pre><code>.flex-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}</code></pre>
        
        <h2>CSS Custom Properties</h2>
        <p>Also known as CSS variables, custom properties allow you to store and reuse values throughout your stylesheet, making theming and maintenance much easier.</p>
        <pre><code>:root {
  --primary-color: #007bff;
  --spacing: 1rem;
}

.button {
  background-color: var(--primary-color);
  padding: var(--spacing);
}</code></pre>
        """,
        "tags": ["Design", "Web Development", "CSS"],
    },
    {
        "title": "Understanding JavaScript Closures",
        "subtitle": "Master one of JavaScript's most powerful features",
        "body_html": """
        <h2>What is a Closure?</h2>
        <p>A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned. This is a powerful feature of JavaScript.</p>
        
        <h2>Basic Example</h2>
        <pre><code>function createCounter() {
  let count = 0;
  
  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2</code></pre>
        
        <h2>Practical Uses</h2>
        <h3>Data Privacy</h3>
        <p>Closures can be used to create private variables that can't be accessed from outside the function.</p>
        
        <h3>Factory Functions</h3>
        <p>Closures are perfect for creating factory functions that generate customized functions.</p>
        
        <h2>Common Pitfalls</h2>
        <p>Be aware of memory leaks. If you're not careful, closures can hold references to large objects longer than necessary.</p>
        """,
        "tags": ["Tech", "JavaScript", "Programming"],
    },
    {
        "title": "Responsive Web Design Principles",
        "subtitle": "Creating websites that work on all devices",
        "body_html": """
        <h2>Mobile-First Approach</h2>
        <p>Start designing for the smallest screen first, then progressively enhance for larger screens. This ensures your content works everywhere.</p>
        
        <h2>Fluid Grids</h2>
        <p>Use relative units like percentages instead of fixed pixel widths. This allows your layout to adapt to different screen sizes.</p>
        
        <h2>Flexible Images</h2>
        <pre><code>img {
  max-width: 100%;
  height: auto;
}</code></pre>
        
        <h2>Media Queries</h2>
        <p>Use media queries to apply different styles based on device characteristics:</p>
        <pre><code>@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 960px;
  }
}</code></pre>
        
        <h2>Touch-Friendly Design</h2>
        <p>Make sure interactive elements are large enough to tap easily. A minimum of 44x44 pixels is recommended.</p>
        """,
        "tags": ["Design", "Web Development", "Responsive"],
    },
]

def seed_articles():
    """Seed sample articles into the database"""
    print(f"Seeding articles into {ARTICLES_DIR}...")
    print("-" * 50)
    
    created_count = 0
    
    for idx, article_data in enumerate(SAMPLE_ARTICLES, 1):
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        # Add a small offset to ensure unique timestamps
        timestamp = str(int(timestamp) + idx)
        
        slug = article_data["title"].lower().replace(" ", "-")
        article_id = f"{timestamp}-{slug}"
        
        article = {
            "id": article_id,
            "title": article_data["title"],
            "subtitle": article_data["subtitle"],
            "body_html": article_data["body_html"].strip(),
            "tags": article_data["tags"],
            "slug": slug,
            "created_at": timestamp,
            "cover": None,  # No cover images for seed data
        }
        
        article_path = ARTICLES_DIR / f"{article_id}.json"
        article_path.write_text(
            json.dumps(article, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        
        print(f"✓ Created: {article['title']}")
        created_count += 1
    
    print("-" * 50)
    print(f"Successfully seeded {created_count} articles!")

if __name__ == "__main__":
    seed_articles()
